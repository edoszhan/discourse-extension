/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 348:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var moment = /* unused reexport */ __webpack_require__(716);
moment.tz.load(__webpack_require__(681));

/***/ }),

/***/ 716:
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;//! moment-timezone.js
//! version : 0.5.45
//! Copyright (c) JS Foundation and other contributors
//! license : MIT
//! github.com/moment/moment-timezone

(function (root, factory) {
  "use strict";

  /*global define*/
  if ( true && module.exports) {
    module.exports = factory(__webpack_require__(178)); // Node
  } else if (true) {
    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(178)], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
		__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
		(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__)); // AMD
  } else {}
})(this, function (moment) {
  "use strict";

  // Resolves es6 module loading issue
  if (moment.version === undefined && moment.default) {
    moment = moment.default;
  }

  // Do not load moment-timezone a second time.
  // if (moment.tz !== undefined) {
  // 	logError('Moment Timezone ' + moment.tz.version + ' was already loaded ' + (moment.tz.dataVersion ? 'with data from ' : 'without any data') + moment.tz.dataVersion);
  // 	return moment;
  // }

  var VERSION = "0.5.45",
    zones = {},
    links = {},
    countries = {},
    names = {},
    guesses = {},
    cachedGuess;
  if (!moment || typeof moment.version !== 'string') {
    logError('Moment Timezone requires Moment.js. See https://momentjs.com/timezone/docs/#/use-it/browser/');
  }
  var momentVersion = moment.version.split('.'),
    major = +momentVersion[0],
    minor = +momentVersion[1];

  // Moment.js version check
  if (major < 2 || major === 2 && minor < 6) {
    logError('Moment Timezone requires Moment.js >= 2.6.0. You are using Moment.js ' + moment.version + '. See momentjs.com');
  }

  /************************************
  	Unpacking
  ************************************/

  function charCodeToInt(charCode) {
    if (charCode > 96) {
      return charCode - 87;
    } else if (charCode > 64) {
      return charCode - 29;
    }
    return charCode - 48;
  }
  function unpackBase60(string) {
    var i = 0,
      parts = string.split('.'),
      whole = parts[0],
      fractional = parts[1] || '',
      multiplier = 1,
      num,
      out = 0,
      sign = 1;

    // handle negative numbers
    if (string.charCodeAt(0) === 45) {
      i = 1;
      sign = -1;
    }

    // handle digits before the decimal
    for (i; i < whole.length; i++) {
      num = charCodeToInt(whole.charCodeAt(i));
      out = 60 * out + num;
    }

    // handle digits after the decimal
    for (i = 0; i < fractional.length; i++) {
      multiplier = multiplier / 60;
      num = charCodeToInt(fractional.charCodeAt(i));
      out += num * multiplier;
    }
    return out * sign;
  }
  function arrayToInt(array) {
    for (var i = 0; i < array.length; i++) {
      array[i] = unpackBase60(array[i]);
    }
  }
  function intToUntil(array, length) {
    for (var i = 0; i < length; i++) {
      array[i] = Math.round((array[i - 1] || 0) + array[i] * 60000); // minutes to milliseconds
    }
    array[length - 1] = Infinity;
  }
  function mapIndices(source, indices) {
    var out = [],
      i;
    for (i = 0; i < indices.length; i++) {
      out[i] = source[indices[i]];
    }
    return out;
  }
  function unpack(string) {
    var data = string.split('|'),
      offsets = data[2].split(' '),
      indices = data[3].split(''),
      untils = data[4].split(' ');
    arrayToInt(offsets);
    arrayToInt(indices);
    arrayToInt(untils);
    intToUntil(untils, indices.length);
    return {
      name: data[0],
      abbrs: mapIndices(data[1].split(' '), indices),
      offsets: mapIndices(offsets, indices),
      untils: untils,
      population: data[5] | 0
    };
  }

  /************************************
  	Zone object
  ************************************/

  function Zone(packedString) {
    if (packedString) {
      this._set(unpack(packedString));
    }
  }
  function closest(num, arr) {
    var len = arr.length;
    if (num < arr[0]) {
      return 0;
    } else if (len > 1 && arr[len - 1] === Infinity && num >= arr[len - 2]) {
      return len - 1;
    } else if (num >= arr[len - 1]) {
      return -1;
    }
    var mid;
    var lo = 0;
    var hi = len - 1;
    while (hi - lo > 1) {
      mid = Math.floor((lo + hi) / 2);
      if (arr[mid] <= num) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return hi;
  }
  Zone.prototype = {
    _set: function (unpacked) {
      this.name = unpacked.name;
      this.abbrs = unpacked.abbrs;
      this.untils = unpacked.untils;
      this.offsets = unpacked.offsets;
      this.population = unpacked.population;
    },
    _index: function (timestamp) {
      var target = +timestamp,
        untils = this.untils,
        i;
      i = closest(target, untils);
      if (i >= 0) {
        return i;
      }
    },
    countries: function () {
      var zone_name = this.name;
      return Object.keys(countries).filter(function (country_code) {
        return countries[country_code].zones.indexOf(zone_name) !== -1;
      });
    },
    parse: function (timestamp) {
      var target = +timestamp,
        offsets = this.offsets,
        untils = this.untils,
        max = untils.length - 1,
        offset,
        offsetNext,
        offsetPrev,
        i;
      for (i = 0; i < max; i++) {
        offset = offsets[i];
        offsetNext = offsets[i + 1];
        offsetPrev = offsets[i ? i - 1 : i];
        if (offset < offsetNext && tz.moveAmbiguousForward) {
          offset = offsetNext;
        } else if (offset > offsetPrev && tz.moveInvalidForward) {
          offset = offsetPrev;
        }
        if (target < untils[i] - offset * 60000) {
          return offsets[i];
        }
      }
      return offsets[max];
    },
    abbr: function (mom) {
      return this.abbrs[this._index(mom)];
    },
    offset: function (mom) {
      logError("zone.offset has been deprecated in favor of zone.utcOffset");
      return this.offsets[this._index(mom)];
    },
    utcOffset: function (mom) {
      return this.offsets[this._index(mom)];
    }
  };

  /************************************
  	Country object
  ************************************/

  function Country(country_name, zone_names) {
    this.name = country_name;
    this.zones = zone_names;
  }

  /************************************
  	Current Timezone
  ************************************/

  function OffsetAt(at) {
    var timeString = at.toTimeString();
    var abbr = timeString.match(/\([a-z ]+\)/i);
    if (abbr && abbr[0]) {
      // 17:56:31 GMT-0600 (CST)
      // 17:56:31 GMT-0600 (Central Standard Time)
      abbr = abbr[0].match(/[A-Z]/g);
      abbr = abbr ? abbr.join('') : undefined;
    } else {
      // 17:56:31 CST
      // 17:56:31 GMT+0800 (台北標準時間)
      abbr = timeString.match(/[A-Z]{3,5}/g);
      abbr = abbr ? abbr[0] : undefined;
    }
    if (abbr === 'GMT') {
      abbr = undefined;
    }
    this.at = +at;
    this.abbr = abbr;
    this.offset = at.getTimezoneOffset();
  }
  function ZoneScore(zone) {
    this.zone = zone;
    this.offsetScore = 0;
    this.abbrScore = 0;
  }
  ZoneScore.prototype.scoreOffsetAt = function (offsetAt) {
    this.offsetScore += Math.abs(this.zone.utcOffset(offsetAt.at) - offsetAt.offset);
    if (this.zone.abbr(offsetAt.at).replace(/[^A-Z]/g, '') !== offsetAt.abbr) {
      this.abbrScore++;
    }
  };
  function findChange(low, high) {
    var mid, diff;
    while (diff = ((high.at - low.at) / 12e4 | 0) * 6e4) {
      mid = new OffsetAt(new Date(low.at + diff));
      if (mid.offset === low.offset) {
        low = mid;
      } else {
        high = mid;
      }
    }
    return low;
  }
  function userOffsets() {
    var startYear = new Date().getFullYear() - 2,
      last = new OffsetAt(new Date(startYear, 0, 1)),
      lastOffset = last.offset,
      offsets = [last],
      change,
      next,
      nextOffset,
      i;
    for (i = 1; i < 48; i++) {
      nextOffset = new Date(startYear, i, 1).getTimezoneOffset();
      if (nextOffset !== lastOffset) {
        // Create OffsetAt here to avoid unnecessary abbr parsing before checking offsets
        next = new OffsetAt(new Date(startYear, i, 1));
        change = findChange(last, next);
        offsets.push(change);
        offsets.push(new OffsetAt(new Date(change.at + 6e4)));
        last = next;
        lastOffset = nextOffset;
      }
    }
    for (i = 0; i < 4; i++) {
      offsets.push(new OffsetAt(new Date(startYear + i, 0, 1)));
      offsets.push(new OffsetAt(new Date(startYear + i, 6, 1)));
    }
    return offsets;
  }
  function sortZoneScores(a, b) {
    if (a.offsetScore !== b.offsetScore) {
      return a.offsetScore - b.offsetScore;
    }
    if (a.abbrScore !== b.abbrScore) {
      return a.abbrScore - b.abbrScore;
    }
    if (a.zone.population !== b.zone.population) {
      return b.zone.population - a.zone.population;
    }
    return b.zone.name.localeCompare(a.zone.name);
  }
  function addToGuesses(name, offsets) {
    var i, offset;
    arrayToInt(offsets);
    for (i = 0; i < offsets.length; i++) {
      offset = offsets[i];
      guesses[offset] = guesses[offset] || {};
      guesses[offset][name] = true;
    }
  }
  function guessesForUserOffsets(offsets) {
    var offsetsLength = offsets.length,
      filteredGuesses = {},
      out = [],
      checkedOffsets = {},
      i,
      j,
      offset,
      guessesOffset;
    for (i = 0; i < offsetsLength; i++) {
      offset = offsets[i].offset;
      if (checkedOffsets.hasOwnProperty(offset)) {
        continue;
      }
      guessesOffset = guesses[offset] || {};
      for (j in guessesOffset) {
        if (guessesOffset.hasOwnProperty(j)) {
          filteredGuesses[j] = true;
        }
      }
      checkedOffsets[offset] = true;
    }
    for (i in filteredGuesses) {
      if (filteredGuesses.hasOwnProperty(i)) {
        out.push(names[i]);
      }
    }
    return out;
  }
  function rebuildGuess() {
    // use Intl API when available and returning valid time zone
    try {
      var intlName = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (intlName && intlName.length > 3) {
        var name = names[normalizeName(intlName)];
        if (name) {
          return name;
        }
        logError("Moment Timezone found " + intlName + " from the Intl api, but did not have that data loaded.");
      }
    } catch (e) {
      // Intl unavailable, fall back to manual guessing.
    }
    var offsets = userOffsets(),
      offsetsLength = offsets.length,
      guesses = guessesForUserOffsets(offsets),
      zoneScores = [],
      zoneScore,
      i,
      j;
    for (i = 0; i < guesses.length; i++) {
      zoneScore = new ZoneScore(getZone(guesses[i]), offsetsLength);
      for (j = 0; j < offsetsLength; j++) {
        zoneScore.scoreOffsetAt(offsets[j]);
      }
      zoneScores.push(zoneScore);
    }
    zoneScores.sort(sortZoneScores);
    return zoneScores.length > 0 ? zoneScores[0].zone.name : undefined;
  }
  function guess(ignoreCache) {
    if (!cachedGuess || ignoreCache) {
      cachedGuess = rebuildGuess();
    }
    return cachedGuess;
  }

  /************************************
  	Global Methods
  ************************************/

  function normalizeName(name) {
    return (name || '').toLowerCase().replace(/\//g, '_');
  }
  function addZone(packed) {
    var i, name, split, normalized;
    if (typeof packed === "string") {
      packed = [packed];
    }
    for (i = 0; i < packed.length; i++) {
      split = packed[i].split('|');
      name = split[0];
      normalized = normalizeName(name);
      zones[normalized] = packed[i];
      names[normalized] = name;
      addToGuesses(normalized, split[2].split(' '));
    }
  }
  function getZone(name, caller) {
    name = normalizeName(name);
    var zone = zones[name];
    var link;
    if (zone instanceof Zone) {
      return zone;
    }
    if (typeof zone === 'string') {
      zone = new Zone(zone);
      zones[name] = zone;
      return zone;
    }

    // Pass getZone to prevent recursion more than 1 level deep
    if (links[name] && caller !== getZone && (link = getZone(links[name], getZone))) {
      zone = zones[name] = new Zone();
      zone._set(link);
      zone.name = names[name];
      return zone;
    }
    return null;
  }
  function getNames() {
    var i,
      out = [];
    for (i in names) {
      if (names.hasOwnProperty(i) && (zones[i] || zones[links[i]]) && names[i]) {
        out.push(names[i]);
      }
    }
    return out.sort();
  }
  function getCountryNames() {
    return Object.keys(countries);
  }
  function addLink(aliases) {
    var i, alias, normal0, normal1;
    if (typeof aliases === "string") {
      aliases = [aliases];
    }
    for (i = 0; i < aliases.length; i++) {
      alias = aliases[i].split('|');
      normal0 = normalizeName(alias[0]);
      normal1 = normalizeName(alias[1]);
      links[normal0] = normal1;
      names[normal0] = alias[0];
      links[normal1] = normal0;
      names[normal1] = alias[1];
    }
  }
  function addCountries(data) {
    var i, country_code, country_zones, split;
    if (!data || !data.length) return;
    for (i = 0; i < data.length; i++) {
      split = data[i].split('|');
      country_code = split[0].toUpperCase();
      country_zones = split[1].split(' ');
      countries[country_code] = new Country(country_code, country_zones);
    }
  }
  function getCountry(name) {
    name = name.toUpperCase();
    return countries[name] || null;
  }
  function zonesForCountry(country, with_offset) {
    country = getCountry(country);
    if (!country) return null;
    var zones = country.zones.sort();
    if (with_offset) {
      return zones.map(function (zone_name) {
        var zone = getZone(zone_name);
        return {
          name: zone_name,
          offset: zone.utcOffset(new Date())
        };
      });
    }
    return zones;
  }
  function loadData(data) {
    addZone(data.zones);
    addLink(data.links);
    addCountries(data.countries);
    tz.dataVersion = data.version;
  }
  function zoneExists(name) {
    if (!zoneExists.didShowError) {
      zoneExists.didShowError = true;
      logError("moment.tz.zoneExists('" + name + "') has been deprecated in favor of !moment.tz.zone('" + name + "')");
    }
    return !!getZone(name);
  }
  function needsOffset(m) {
    var isUnixTimestamp = m._f === 'X' || m._f === 'x';
    return !!(m._a && m._tzm === undefined && !isUnixTimestamp);
  }
  function logError(message) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error(message);
    }
  }

  /************************************
  	moment.tz namespace
  ************************************/

  function tz(input) {
    var args = Array.prototype.slice.call(arguments, 0, -1),
      name = arguments[arguments.length - 1],
      out = moment.utc.apply(null, args),
      zone;
    if (!moment.isMoment(input) && needsOffset(out) && (zone = getZone(name))) {
      out.add(zone.parse(out), 'minutes');
    }
    out.tz(name);
    return out;
  }
  tz.version = VERSION;
  tz.dataVersion = '';
  tz._zones = zones;
  tz._links = links;
  tz._names = names;
  tz._countries = countries;
  tz.add = addZone;
  tz.link = addLink;
  tz.load = loadData;
  tz.zone = getZone;
  tz.zoneExists = zoneExists; // deprecated in 0.1.0
  tz.guess = guess;
  tz.names = getNames;
  tz.Zone = Zone;
  tz.unpack = unpack;
  tz.unpackBase60 = unpackBase60;
  tz.needsOffset = needsOffset;
  tz.moveInvalidForward = true;
  tz.moveAmbiguousForward = false;
  tz.countries = getCountryNames;
  tz.zonesForCountry = zonesForCountry;

  /************************************
  	Interface with Moment.js
  ************************************/

  var fn = moment.fn;
  moment.tz = tz;
  moment.defaultZone = null;
  moment.updateOffset = function (mom, keepTime) {
    var zone = moment.defaultZone,
      offset;
    if (mom._z === undefined) {
      if (zone && needsOffset(mom) && !mom._isUTC && mom.isValid()) {
        mom._d = moment.utc(mom._a)._d;
        mom.utc().add(zone.parse(mom), 'minutes');
      }
      mom._z = zone;
    }
    if (mom._z) {
      offset = mom._z.utcOffset(mom);
      if (Math.abs(offset) < 16) {
        offset = offset / 60;
      }
      if (mom.utcOffset !== undefined) {
        var z = mom._z;
        mom.utcOffset(-offset, keepTime);
        mom._z = z;
      } else {
        mom.zone(offset, keepTime);
      }
    }
  };
  fn.tz = function (name, keepTime) {
    if (name) {
      if (typeof name !== 'string') {
        throw new Error('Time zone name must be a string, got ' + name + ' [' + typeof name + ']');
      }
      this._z = getZone(name);
      if (this._z) {
        moment.updateOffset(this, keepTime);
      } else {
        logError("Moment Timezone has no data for " + name + ". See http://momentjs.com/timezone/docs/#/data-loading/.");
      }
      return this;
    }
    if (this._z) {
      return this._z.name;
    }
  };
  function abbrWrap(old) {
    return function () {
      if (this._z) {
        return this._z.abbr(this);
      }
      return old.call(this);
    };
  }
  function resetZoneWrap(old) {
    return function () {
      this._z = null;
      return old.apply(this, arguments);
    };
  }
  function resetZoneWrap2(old) {
    return function () {
      if (arguments.length > 0) this._z = null;
      return old.apply(this, arguments);
    };
  }
  fn.zoneName = abbrWrap(fn.zoneName);
  fn.zoneAbbr = abbrWrap(fn.zoneAbbr);
  fn.utc = resetZoneWrap(fn.utc);
  fn.local = resetZoneWrap(fn.local);
  fn.utcOffset = resetZoneWrap2(fn.utcOffset);
  moment.tz.setDefault = function (name) {
    if (major < 2 || major === 2 && minor < 9) {
      logError('Moment Timezone setDefault() requires Moment.js >= 2.9.0. You are using Moment.js ' + moment.version + '.');
    }
    moment.defaultZone = name ? getZone(name) : null;
    return moment;
  };

  // Cloning a moment should include the _z property.
  var momentProperties = moment.momentProperties;
  if (Object.prototype.toString.call(momentProperties) === '[object Array]') {
    // moment 2.8.1+
    momentProperties.push('_z');
    momentProperties.push('_a');
  } else if (momentProperties) {
    // moment 2.7.0
    momentProperties._z = null;
  }

  // INJECT DATA

  return moment;
});

/***/ }),

/***/ 178:
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

/* module decorator */ module = __webpack_require__.nmd(module);
//! moment.js
//! version : 2.30.1
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

;
(function (global, factory) {
   true ? module.exports = factory() : 0;
})(this, function () {
  'use strict';

  var hookCallback;
  function hooks() {
    return hookCallback.apply(null, arguments);
  }

  // This is done to register the method called with moment()
  // without creating circular dependencies.
  function setHookCallback(callback) {
    hookCallback = callback;
  }
  function isArray(input) {
    return input instanceof Array || Object.prototype.toString.call(input) === '[object Array]';
  }
  function isObject(input) {
    // IE8 will treat undefined and null as object if it wasn't for
    // input != null
    return input != null && Object.prototype.toString.call(input) === '[object Object]';
  }
  function hasOwnProp(a, b) {
    return Object.prototype.hasOwnProperty.call(a, b);
  }
  function isObjectEmpty(obj) {
    if (Object.getOwnPropertyNames) {
      return Object.getOwnPropertyNames(obj).length === 0;
    } else {
      var k;
      for (k in obj) {
        if (hasOwnProp(obj, k)) {
          return false;
        }
      }
      return true;
    }
  }
  function isUndefined(input) {
    return input === void 0;
  }
  function isNumber(input) {
    return typeof input === 'number' || Object.prototype.toString.call(input) === '[object Number]';
  }
  function isDate(input) {
    return input instanceof Date || Object.prototype.toString.call(input) === '[object Date]';
  }
  function map(arr, fn) {
    var res = [],
      i,
      arrLen = arr.length;
    for (i = 0; i < arrLen; ++i) {
      res.push(fn(arr[i], i));
    }
    return res;
  }
  function extend(a, b) {
    for (var i in b) {
      if (hasOwnProp(b, i)) {
        a[i] = b[i];
      }
    }
    if (hasOwnProp(b, 'toString')) {
      a.toString = b.toString;
    }
    if (hasOwnProp(b, 'valueOf')) {
      a.valueOf = b.valueOf;
    }
    return a;
  }
  function createUTC(input, format, locale, strict) {
    return createLocalOrUTC(input, format, locale, strict, true).utc();
  }
  function defaultParsingFlags() {
    // We need to deep clone this object.
    return {
      empty: false,
      unusedTokens: [],
      unusedInput: [],
      overflow: -2,
      charsLeftOver: 0,
      nullInput: false,
      invalidEra: null,
      invalidMonth: null,
      invalidFormat: false,
      userInvalidated: false,
      iso: false,
      parsedDateParts: [],
      era: null,
      meridiem: null,
      rfc2822: false,
      weekdayMismatch: false
    };
  }
  function getParsingFlags(m) {
    if (m._pf == null) {
      m._pf = defaultParsingFlags();
    }
    return m._pf;
  }
  var some;
  if (Array.prototype.some) {
    some = Array.prototype.some;
  } else {
    some = function (fun) {
      var t = Object(this),
        len = t.length >>> 0,
        i;
      for (i = 0; i < len; i++) {
        if (i in t && fun.call(this, t[i], i, t)) {
          return true;
        }
      }
      return false;
    };
  }
  function isValid(m) {
    var flags = null,
      parsedParts = false,
      isNowValid = m._d && !isNaN(m._d.getTime());
    if (isNowValid) {
      flags = getParsingFlags(m);
      parsedParts = some.call(flags.parsedDateParts, function (i) {
        return i != null;
      });
      isNowValid = flags.overflow < 0 && !flags.empty && !flags.invalidEra && !flags.invalidMonth && !flags.invalidWeekday && !flags.weekdayMismatch && !flags.nullInput && !flags.invalidFormat && !flags.userInvalidated && (!flags.meridiem || flags.meridiem && parsedParts);
      if (m._strict) {
        isNowValid = isNowValid && flags.charsLeftOver === 0 && flags.unusedTokens.length === 0 && flags.bigHour === undefined;
      }
    }
    if (Object.isFrozen == null || !Object.isFrozen(m)) {
      m._isValid = isNowValid;
    } else {
      return isNowValid;
    }
    return m._isValid;
  }
  function createInvalid(flags) {
    var m = createUTC(NaN);
    if (flags != null) {
      extend(getParsingFlags(m), flags);
    } else {
      getParsingFlags(m).userInvalidated = true;
    }
    return m;
  }

  // Plugins that add properties should also add the key here (null value),
  // so we can properly clone ourselves.
  var momentProperties = hooks.momentProperties = [],
    updateInProgress = false;
  function copyConfig(to, from) {
    var i,
      prop,
      val,
      momentPropertiesLen = momentProperties.length;
    if (!isUndefined(from._isAMomentObject)) {
      to._isAMomentObject = from._isAMomentObject;
    }
    if (!isUndefined(from._i)) {
      to._i = from._i;
    }
    if (!isUndefined(from._f)) {
      to._f = from._f;
    }
    if (!isUndefined(from._l)) {
      to._l = from._l;
    }
    if (!isUndefined(from._strict)) {
      to._strict = from._strict;
    }
    if (!isUndefined(from._tzm)) {
      to._tzm = from._tzm;
    }
    if (!isUndefined(from._isUTC)) {
      to._isUTC = from._isUTC;
    }
    if (!isUndefined(from._offset)) {
      to._offset = from._offset;
    }
    if (!isUndefined(from._pf)) {
      to._pf = getParsingFlags(from);
    }
    if (!isUndefined(from._locale)) {
      to._locale = from._locale;
    }
    if (momentPropertiesLen > 0) {
      for (i = 0; i < momentPropertiesLen; i++) {
        prop = momentProperties[i];
        val = from[prop];
        if (!isUndefined(val)) {
          to[prop] = val;
        }
      }
    }
    return to;
  }

  // Moment prototype object
  function Moment(config) {
    copyConfig(this, config);
    this._d = new Date(config._d != null ? config._d.getTime() : NaN);
    if (!this.isValid()) {
      this._d = new Date(NaN);
    }
    // Prevent infinite loop in case updateOffset creates new moment
    // objects.
    if (updateInProgress === false) {
      updateInProgress = true;
      hooks.updateOffset(this);
      updateInProgress = false;
    }
  }
  function isMoment(obj) {
    return obj instanceof Moment || obj != null && obj._isAMomentObject != null;
  }
  function warn(msg) {
    if (hooks.suppressDeprecationWarnings === false && typeof console !== 'undefined' && console.warn) {
      console.warn('Deprecation warning: ' + msg);
    }
  }
  function deprecate(msg, fn) {
    var firstTime = true;
    return extend(function () {
      if (hooks.deprecationHandler != null) {
        hooks.deprecationHandler(null, msg);
      }
      if (firstTime) {
        var args = [],
          arg,
          i,
          key,
          argLen = arguments.length;
        for (i = 0; i < argLen; i++) {
          arg = '';
          if (typeof arguments[i] === 'object') {
            arg += '\n[' + i + '] ';
            for (key in arguments[0]) {
              if (hasOwnProp(arguments[0], key)) {
                arg += key + ': ' + arguments[0][key] + ', ';
              }
            }
            arg = arg.slice(0, -2); // Remove trailing comma and space
          } else {
            arg = arguments[i];
          }
          args.push(arg);
        }
        warn(msg + '\nArguments: ' + Array.prototype.slice.call(args).join('') + '\n' + new Error().stack);
        firstTime = false;
      }
      return fn.apply(this, arguments);
    }, fn);
  }
  var deprecations = {};
  function deprecateSimple(name, msg) {
    if (hooks.deprecationHandler != null) {
      hooks.deprecationHandler(name, msg);
    }
    if (!deprecations[name]) {
      warn(msg);
      deprecations[name] = true;
    }
  }
  hooks.suppressDeprecationWarnings = false;
  hooks.deprecationHandler = null;
  function isFunction(input) {
    return typeof Function !== 'undefined' && input instanceof Function || Object.prototype.toString.call(input) === '[object Function]';
  }
  function set(config) {
    var prop, i;
    for (i in config) {
      if (hasOwnProp(config, i)) {
        prop = config[i];
        if (isFunction(prop)) {
          this[i] = prop;
        } else {
          this['_' + i] = prop;
        }
      }
    }
    this._config = config;
    // Lenient ordinal parsing accepts just a number in addition to
    // number + (possibly) stuff coming from _dayOfMonthOrdinalParse.
    // TODO: Remove "ordinalParse" fallback in next major release.
    this._dayOfMonthOrdinalParseLenient = new RegExp((this._dayOfMonthOrdinalParse.source || this._ordinalParse.source) + '|' + /\d{1,2}/.source);
  }
  function mergeConfigs(parentConfig, childConfig) {
    var res = extend({}, parentConfig),
      prop;
    for (prop in childConfig) {
      if (hasOwnProp(childConfig, prop)) {
        if (isObject(parentConfig[prop]) && isObject(childConfig[prop])) {
          res[prop] = {};
          extend(res[prop], parentConfig[prop]);
          extend(res[prop], childConfig[prop]);
        } else if (childConfig[prop] != null) {
          res[prop] = childConfig[prop];
        } else {
          delete res[prop];
        }
      }
    }
    for (prop in parentConfig) {
      if (hasOwnProp(parentConfig, prop) && !hasOwnProp(childConfig, prop) && isObject(parentConfig[prop])) {
        // make sure changes to properties don't modify parent config
        res[prop] = extend({}, res[prop]);
      }
    }
    return res;
  }
  function Locale(config) {
    if (config != null) {
      this.set(config);
    }
  }
  var keys;
  if (Object.keys) {
    keys = Object.keys;
  } else {
    keys = function (obj) {
      var i,
        res = [];
      for (i in obj) {
        if (hasOwnProp(obj, i)) {
          res.push(i);
        }
      }
      return res;
    };
  }
  var defaultCalendar = {
    sameDay: '[Today at] LT',
    nextDay: '[Tomorrow at] LT',
    nextWeek: 'dddd [at] LT',
    lastDay: '[Yesterday at] LT',
    lastWeek: '[Last] dddd [at] LT',
    sameElse: 'L'
  };
  function calendar(key, mom, now) {
    var output = this._calendar[key] || this._calendar['sameElse'];
    return isFunction(output) ? output.call(mom, now) : output;
  }
  function zeroFill(number, targetLength, forceSign) {
    var absNumber = '' + Math.abs(number),
      zerosToFill = targetLength - absNumber.length,
      sign = number >= 0;
    return (sign ? forceSign ? '+' : '' : '-') + Math.pow(10, Math.max(0, zerosToFill)).toString().substr(1) + absNumber;
  }
  var formattingTokens = /(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|N{1,5}|YYYYYY|YYYYY|YYYY|YY|y{2,4}|yo?|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g,
    localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,
    formatFunctions = {},
    formatTokenFunctions = {};

  // token:    'M'
  // padded:   ['MM', 2]
  // ordinal:  'Mo'
  // callback: function () { this.month() + 1 }
  function addFormatToken(token, padded, ordinal, callback) {
    var func = callback;
    if (typeof callback === 'string') {
      func = function () {
        return this[callback]();
      };
    }
    if (token) {
      formatTokenFunctions[token] = func;
    }
    if (padded) {
      formatTokenFunctions[padded[0]] = function () {
        return zeroFill(func.apply(this, arguments), padded[1], padded[2]);
      };
    }
    if (ordinal) {
      formatTokenFunctions[ordinal] = function () {
        return this.localeData().ordinal(func.apply(this, arguments), token);
      };
    }
  }
  function removeFormattingTokens(input) {
    if (input.match(/\[[\s\S]/)) {
      return input.replace(/^\[|\]$/g, '');
    }
    return input.replace(/\\/g, '');
  }
  function makeFormatFunction(format) {
    var array = format.match(formattingTokens),
      i,
      length;
    for (i = 0, length = array.length; i < length; i++) {
      if (formatTokenFunctions[array[i]]) {
        array[i] = formatTokenFunctions[array[i]];
      } else {
        array[i] = removeFormattingTokens(array[i]);
      }
    }
    return function (mom) {
      var output = '',
        i;
      for (i = 0; i < length; i++) {
        output += isFunction(array[i]) ? array[i].call(mom, format) : array[i];
      }
      return output;
    };
  }

  // format date using native date object
  function formatMoment(m, format) {
    if (!m.isValid()) {
      return m.localeData().invalidDate();
    }
    format = expandFormat(format, m.localeData());
    formatFunctions[format] = formatFunctions[format] || makeFormatFunction(format);
    return formatFunctions[format](m);
  }
  function expandFormat(format, locale) {
    var i = 5;
    function replaceLongDateFormatTokens(input) {
      return locale.longDateFormat(input) || input;
    }
    localFormattingTokens.lastIndex = 0;
    while (i >= 0 && localFormattingTokens.test(format)) {
      format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
      localFormattingTokens.lastIndex = 0;
      i -= 1;
    }
    return format;
  }
  var defaultLongDateFormat = {
    LTS: 'h:mm:ss A',
    LT: 'h:mm A',
    L: 'MM/DD/YYYY',
    LL: 'MMMM D, YYYY',
    LLL: 'MMMM D, YYYY h:mm A',
    LLLL: 'dddd, MMMM D, YYYY h:mm A'
  };
  function longDateFormat(key) {
    var format = this._longDateFormat[key],
      formatUpper = this._longDateFormat[key.toUpperCase()];
    if (format || !formatUpper) {
      return format;
    }
    this._longDateFormat[key] = formatUpper.match(formattingTokens).map(function (tok) {
      if (tok === 'MMMM' || tok === 'MM' || tok === 'DD' || tok === 'dddd') {
        return tok.slice(1);
      }
      return tok;
    }).join('');
    return this._longDateFormat[key];
  }
  var defaultInvalidDate = 'Invalid date';
  function invalidDate() {
    return this._invalidDate;
  }
  var defaultOrdinal = '%d',
    defaultDayOfMonthOrdinalParse = /\d{1,2}/;
  function ordinal(number) {
    return this._ordinal.replace('%d', number);
  }
  var defaultRelativeTime = {
    future: 'in %s',
    past: '%s ago',
    s: 'a few seconds',
    ss: '%d seconds',
    m: 'a minute',
    mm: '%d minutes',
    h: 'an hour',
    hh: '%d hours',
    d: 'a day',
    dd: '%d days',
    w: 'a week',
    ww: '%d weeks',
    M: 'a month',
    MM: '%d months',
    y: 'a year',
    yy: '%d years'
  };
  function relativeTime(number, withoutSuffix, string, isFuture) {
    var output = this._relativeTime[string];
    return isFunction(output) ? output(number, withoutSuffix, string, isFuture) : output.replace(/%d/i, number);
  }
  function pastFuture(diff, output) {
    var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
    return isFunction(format) ? format(output) : format.replace(/%s/i, output);
  }
  var aliases = {
    D: 'date',
    dates: 'date',
    date: 'date',
    d: 'day',
    days: 'day',
    day: 'day',
    e: 'weekday',
    weekdays: 'weekday',
    weekday: 'weekday',
    E: 'isoWeekday',
    isoweekdays: 'isoWeekday',
    isoweekday: 'isoWeekday',
    DDD: 'dayOfYear',
    dayofyears: 'dayOfYear',
    dayofyear: 'dayOfYear',
    h: 'hour',
    hours: 'hour',
    hour: 'hour',
    ms: 'millisecond',
    milliseconds: 'millisecond',
    millisecond: 'millisecond',
    m: 'minute',
    minutes: 'minute',
    minute: 'minute',
    M: 'month',
    months: 'month',
    month: 'month',
    Q: 'quarter',
    quarters: 'quarter',
    quarter: 'quarter',
    s: 'second',
    seconds: 'second',
    second: 'second',
    gg: 'weekYear',
    weekyears: 'weekYear',
    weekyear: 'weekYear',
    GG: 'isoWeekYear',
    isoweekyears: 'isoWeekYear',
    isoweekyear: 'isoWeekYear',
    w: 'week',
    weeks: 'week',
    week: 'week',
    W: 'isoWeek',
    isoweeks: 'isoWeek',
    isoweek: 'isoWeek',
    y: 'year',
    years: 'year',
    year: 'year'
  };
  function normalizeUnits(units) {
    return typeof units === 'string' ? aliases[units] || aliases[units.toLowerCase()] : undefined;
  }
  function normalizeObjectUnits(inputObject) {
    var normalizedInput = {},
      normalizedProp,
      prop;
    for (prop in inputObject) {
      if (hasOwnProp(inputObject, prop)) {
        normalizedProp = normalizeUnits(prop);
        if (normalizedProp) {
          normalizedInput[normalizedProp] = inputObject[prop];
        }
      }
    }
    return normalizedInput;
  }
  var priorities = {
    date: 9,
    day: 11,
    weekday: 11,
    isoWeekday: 11,
    dayOfYear: 4,
    hour: 13,
    millisecond: 16,
    minute: 14,
    month: 8,
    quarter: 7,
    second: 15,
    weekYear: 1,
    isoWeekYear: 1,
    week: 5,
    isoWeek: 5,
    year: 1
  };
  function getPrioritizedUnits(unitsObj) {
    var units = [],
      u;
    for (u in unitsObj) {
      if (hasOwnProp(unitsObj, u)) {
        units.push({
          unit: u,
          priority: priorities[u]
        });
      }
    }
    units.sort(function (a, b) {
      return a.priority - b.priority;
    });
    return units;
  }
  var match1 = /\d/,
    //       0 - 9
    match2 = /\d\d/,
    //      00 - 99
    match3 = /\d{3}/,
    //     000 - 999
    match4 = /\d{4}/,
    //    0000 - 9999
    match6 = /[+-]?\d{6}/,
    // -999999 - 999999
    match1to2 = /\d\d?/,
    //       0 - 99
    match3to4 = /\d\d\d\d?/,
    //     999 - 9999
    match5to6 = /\d\d\d\d\d\d?/,
    //   99999 - 999999
    match1to3 = /\d{1,3}/,
    //       0 - 999
    match1to4 = /\d{1,4}/,
    //       0 - 9999
    match1to6 = /[+-]?\d{1,6}/,
    // -999999 - 999999
    matchUnsigned = /\d+/,
    //       0 - inf
    matchSigned = /[+-]?\d+/,
    //    -inf - inf
    matchOffset = /Z|[+-]\d\d:?\d\d/gi,
    // +00:00 -00:00 +0000 -0000 or Z
    matchShortOffset = /Z|[+-]\d\d(?::?\d\d)?/gi,
    // +00 -00 +00:00 -00:00 +0000 -0000 or Z
    matchTimestamp = /[+-]?\d+(\.\d{1,3})?/,
    // 123456789 123456789.123
    // any word (or two) characters or numbers including two/three word month in arabic.
    // includes scottish gaelic two word and hyphenated months
    matchWord = /[0-9]{0,256}['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFF07\uFF10-\uFFEF]{1,256}|[\u0600-\u06FF\/]{1,256}(\s*?[\u0600-\u06FF]{1,256}){1,2}/i,
    match1to2NoLeadingZero = /^[1-9]\d?/,
    //         1-99
    match1to2HasZero = /^([1-9]\d|\d)/,
    //           0-99
    regexes;
  regexes = {};
  function addRegexToken(token, regex, strictRegex) {
    regexes[token] = isFunction(regex) ? regex : function (isStrict, localeData) {
      return isStrict && strictRegex ? strictRegex : regex;
    };
  }
  function getParseRegexForToken(token, config) {
    if (!hasOwnProp(regexes, token)) {
      return new RegExp(unescapeFormat(token));
    }
    return regexes[token](config._strict, config._locale);
  }

  // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
  function unescapeFormat(s) {
    return regexEscape(s.replace('\\', '').replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
      return p1 || p2 || p3 || p4;
    }));
  }
  function regexEscape(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  }
  function absFloor(number) {
    if (number < 0) {
      // -0 -> 0
      return Math.ceil(number) || 0;
    } else {
      return Math.floor(number);
    }
  }
  function toInt(argumentForCoercion) {
    var coercedNumber = +argumentForCoercion,
      value = 0;
    if (coercedNumber !== 0 && isFinite(coercedNumber)) {
      value = absFloor(coercedNumber);
    }
    return value;
  }
  var tokens = {};
  function addParseToken(token, callback) {
    var i,
      func = callback,
      tokenLen;
    if (typeof token === 'string') {
      token = [token];
    }
    if (isNumber(callback)) {
      func = function (input, array) {
        array[callback] = toInt(input);
      };
    }
    tokenLen = token.length;
    for (i = 0; i < tokenLen; i++) {
      tokens[token[i]] = func;
    }
  }
  function addWeekParseToken(token, callback) {
    addParseToken(token, function (input, array, config, token) {
      config._w = config._w || {};
      callback(input, config._w, config, token);
    });
  }
  function addTimeToArrayFromToken(token, input, config) {
    if (input != null && hasOwnProp(tokens, token)) {
      tokens[token](input, config._a, config, token);
    }
  }
  function isLeapYear(year) {
    return year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
  }
  var YEAR = 0,
    MONTH = 1,
    DATE = 2,
    HOUR = 3,
    MINUTE = 4,
    SECOND = 5,
    MILLISECOND = 6,
    WEEK = 7,
    WEEKDAY = 8;

  // FORMATTING

  addFormatToken('Y', 0, 0, function () {
    var y = this.year();
    return y <= 9999 ? zeroFill(y, 4) : '+' + y;
  });
  addFormatToken(0, ['YY', 2], 0, function () {
    return this.year() % 100;
  });
  addFormatToken(0, ['YYYY', 4], 0, 'year');
  addFormatToken(0, ['YYYYY', 5], 0, 'year');
  addFormatToken(0, ['YYYYYY', 6, true], 0, 'year');

  // PARSING

  addRegexToken('Y', matchSigned);
  addRegexToken('YY', match1to2, match2);
  addRegexToken('YYYY', match1to4, match4);
  addRegexToken('YYYYY', match1to6, match6);
  addRegexToken('YYYYYY', match1to6, match6);
  addParseToken(['YYYYY', 'YYYYYY'], YEAR);
  addParseToken('YYYY', function (input, array) {
    array[YEAR] = input.length === 2 ? hooks.parseTwoDigitYear(input) : toInt(input);
  });
  addParseToken('YY', function (input, array) {
    array[YEAR] = hooks.parseTwoDigitYear(input);
  });
  addParseToken('Y', function (input, array) {
    array[YEAR] = parseInt(input, 10);
  });

  // HELPERS

  function daysInYear(year) {
    return isLeapYear(year) ? 366 : 365;
  }

  // HOOKS

  hooks.parseTwoDigitYear = function (input) {
    return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
  };

  // MOMENTS

  var getSetYear = makeGetSet('FullYear', true);
  function getIsLeapYear() {
    return isLeapYear(this.year());
  }
  function makeGetSet(unit, keepTime) {
    return function (value) {
      if (value != null) {
        set$1(this, unit, value);
        hooks.updateOffset(this, keepTime);
        return this;
      } else {
        return get(this, unit);
      }
    };
  }
  function get(mom, unit) {
    if (!mom.isValid()) {
      return NaN;
    }
    var d = mom._d,
      isUTC = mom._isUTC;
    switch (unit) {
      case 'Milliseconds':
        return isUTC ? d.getUTCMilliseconds() : d.getMilliseconds();
      case 'Seconds':
        return isUTC ? d.getUTCSeconds() : d.getSeconds();
      case 'Minutes':
        return isUTC ? d.getUTCMinutes() : d.getMinutes();
      case 'Hours':
        return isUTC ? d.getUTCHours() : d.getHours();
      case 'Date':
        return isUTC ? d.getUTCDate() : d.getDate();
      case 'Day':
        return isUTC ? d.getUTCDay() : d.getDay();
      case 'Month':
        return isUTC ? d.getUTCMonth() : d.getMonth();
      case 'FullYear':
        return isUTC ? d.getUTCFullYear() : d.getFullYear();
      default:
        return NaN;
      // Just in case
    }
  }
  function set$1(mom, unit, value) {
    var d, isUTC, year, month, date;
    if (!mom.isValid() || isNaN(value)) {
      return;
    }
    d = mom._d;
    isUTC = mom._isUTC;
    switch (unit) {
      case 'Milliseconds':
        return void (isUTC ? d.setUTCMilliseconds(value) : d.setMilliseconds(value));
      case 'Seconds':
        return void (isUTC ? d.setUTCSeconds(value) : d.setSeconds(value));
      case 'Minutes':
        return void (isUTC ? d.setUTCMinutes(value) : d.setMinutes(value));
      case 'Hours':
        return void (isUTC ? d.setUTCHours(value) : d.setHours(value));
      case 'Date':
        return void (isUTC ? d.setUTCDate(value) : d.setDate(value));
      // case 'Day': // Not real
      //    return void (isUTC ? d.setUTCDay(value) : d.setDay(value));
      // case 'Month': // Not used because we need to pass two variables
      //     return void (isUTC ? d.setUTCMonth(value) : d.setMonth(value));
      case 'FullYear':
        break;
      // See below ...
      default:
        return;
      // Just in case
    }
    year = value;
    month = mom.month();
    date = mom.date();
    date = date === 29 && month === 1 && !isLeapYear(year) ? 28 : date;
    void (isUTC ? d.setUTCFullYear(year, month, date) : d.setFullYear(year, month, date));
  }

  // MOMENTS

  function stringGet(units) {
    units = normalizeUnits(units);
    if (isFunction(this[units])) {
      return this[units]();
    }
    return this;
  }
  function stringSet(units, value) {
    if (typeof units === 'object') {
      units = normalizeObjectUnits(units);
      var prioritized = getPrioritizedUnits(units),
        i,
        prioritizedLen = prioritized.length;
      for (i = 0; i < prioritizedLen; i++) {
        this[prioritized[i].unit](units[prioritized[i].unit]);
      }
    } else {
      units = normalizeUnits(units);
      if (isFunction(this[units])) {
        return this[units](value);
      }
    }
    return this;
  }
  function mod(n, x) {
    return (n % x + x) % x;
  }
  var indexOf;
  if (Array.prototype.indexOf) {
    indexOf = Array.prototype.indexOf;
  } else {
    indexOf = function (o) {
      // I know
      var i;
      for (i = 0; i < this.length; ++i) {
        if (this[i] === o) {
          return i;
        }
      }
      return -1;
    };
  }
  function daysInMonth(year, month) {
    if (isNaN(year) || isNaN(month)) {
      return NaN;
    }
    var modMonth = mod(month, 12);
    year += (month - modMonth) / 12;
    return modMonth === 1 ? isLeapYear(year) ? 29 : 28 : 31 - modMonth % 7 % 2;
  }

  // FORMATTING

  addFormatToken('M', ['MM', 2], 'Mo', function () {
    return this.month() + 1;
  });
  addFormatToken('MMM', 0, 0, function (format) {
    return this.localeData().monthsShort(this, format);
  });
  addFormatToken('MMMM', 0, 0, function (format) {
    return this.localeData().months(this, format);
  });

  // PARSING

  addRegexToken('M', match1to2, match1to2NoLeadingZero);
  addRegexToken('MM', match1to2, match2);
  addRegexToken('MMM', function (isStrict, locale) {
    return locale.monthsShortRegex(isStrict);
  });
  addRegexToken('MMMM', function (isStrict, locale) {
    return locale.monthsRegex(isStrict);
  });
  addParseToken(['M', 'MM'], function (input, array) {
    array[MONTH] = toInt(input) - 1;
  });
  addParseToken(['MMM', 'MMMM'], function (input, array, config, token) {
    var month = config._locale.monthsParse(input, token, config._strict);
    // if we didn't find a month name, mark the date as invalid.
    if (month != null) {
      array[MONTH] = month;
    } else {
      getParsingFlags(config).invalidMonth = input;
    }
  });

  // LOCALES

  var defaultLocaleMonths = 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_'),
    defaultLocaleMonthsShort = 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_'),
    MONTHS_IN_FORMAT = /D[oD]?(\[[^\[\]]*\]|\s)+MMMM?/,
    defaultMonthsShortRegex = matchWord,
    defaultMonthsRegex = matchWord;
  function localeMonths(m, format) {
    if (!m) {
      return isArray(this._months) ? this._months : this._months['standalone'];
    }
    return isArray(this._months) ? this._months[m.month()] : this._months[(this._months.isFormat || MONTHS_IN_FORMAT).test(format) ? 'format' : 'standalone'][m.month()];
  }
  function localeMonthsShort(m, format) {
    if (!m) {
      return isArray(this._monthsShort) ? this._monthsShort : this._monthsShort['standalone'];
    }
    return isArray(this._monthsShort) ? this._monthsShort[m.month()] : this._monthsShort[MONTHS_IN_FORMAT.test(format) ? 'format' : 'standalone'][m.month()];
  }
  function handleStrictParse(monthName, format, strict) {
    var i,
      ii,
      mom,
      llc = monthName.toLocaleLowerCase();
    if (!this._monthsParse) {
      // this is not used
      this._monthsParse = [];
      this._longMonthsParse = [];
      this._shortMonthsParse = [];
      for (i = 0; i < 12; ++i) {
        mom = createUTC([2000, i]);
        this._shortMonthsParse[i] = this.monthsShort(mom, '').toLocaleLowerCase();
        this._longMonthsParse[i] = this.months(mom, '').toLocaleLowerCase();
      }
    }
    if (strict) {
      if (format === 'MMM') {
        ii = indexOf.call(this._shortMonthsParse, llc);
        return ii !== -1 ? ii : null;
      } else {
        ii = indexOf.call(this._longMonthsParse, llc);
        return ii !== -1 ? ii : null;
      }
    } else {
      if (format === 'MMM') {
        ii = indexOf.call(this._shortMonthsParse, llc);
        if (ii !== -1) {
          return ii;
        }
        ii = indexOf.call(this._longMonthsParse, llc);
        return ii !== -1 ? ii : null;
      } else {
        ii = indexOf.call(this._longMonthsParse, llc);
        if (ii !== -1) {
          return ii;
        }
        ii = indexOf.call(this._shortMonthsParse, llc);
        return ii !== -1 ? ii : null;
      }
    }
  }
  function localeMonthsParse(monthName, format, strict) {
    var i, mom, regex;
    if (this._monthsParseExact) {
      return handleStrictParse.call(this, monthName, format, strict);
    }
    if (!this._monthsParse) {
      this._monthsParse = [];
      this._longMonthsParse = [];
      this._shortMonthsParse = [];
    }

    // TODO: add sorting
    // Sorting makes sure if one month (or abbr) is a prefix of another
    // see sorting in computeMonthsParse
    for (i = 0; i < 12; i++) {
      // make the regex if we don't have it already
      mom = createUTC([2000, i]);
      if (strict && !this._longMonthsParse[i]) {
        this._longMonthsParse[i] = new RegExp('^' + this.months(mom, '').replace('.', '') + '$', 'i');
        this._shortMonthsParse[i] = new RegExp('^' + this.monthsShort(mom, '').replace('.', '') + '$', 'i');
      }
      if (!strict && !this._monthsParse[i]) {
        regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
        this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
      }
      // test the regex
      if (strict && format === 'MMMM' && this._longMonthsParse[i].test(monthName)) {
        return i;
      } else if (strict && format === 'MMM' && this._shortMonthsParse[i].test(monthName)) {
        return i;
      } else if (!strict && this._monthsParse[i].test(monthName)) {
        return i;
      }
    }
  }

  // MOMENTS

  function setMonth(mom, value) {
    if (!mom.isValid()) {
      // No op
      return mom;
    }
    if (typeof value === 'string') {
      if (/^\d+$/.test(value)) {
        value = toInt(value);
      } else {
        value = mom.localeData().monthsParse(value);
        // TODO: Another silent failure?
        if (!isNumber(value)) {
          return mom;
        }
      }
    }
    var month = value,
      date = mom.date();
    date = date < 29 ? date : Math.min(date, daysInMonth(mom.year(), month));
    void (mom._isUTC ? mom._d.setUTCMonth(month, date) : mom._d.setMonth(month, date));
    return mom;
  }
  function getSetMonth(value) {
    if (value != null) {
      setMonth(this, value);
      hooks.updateOffset(this, true);
      return this;
    } else {
      return get(this, 'Month');
    }
  }
  function getDaysInMonth() {
    return daysInMonth(this.year(), this.month());
  }
  function monthsShortRegex(isStrict) {
    if (this._monthsParseExact) {
      if (!hasOwnProp(this, '_monthsRegex')) {
        computeMonthsParse.call(this);
      }
      if (isStrict) {
        return this._monthsShortStrictRegex;
      } else {
        return this._monthsShortRegex;
      }
    } else {
      if (!hasOwnProp(this, '_monthsShortRegex')) {
        this._monthsShortRegex = defaultMonthsShortRegex;
      }
      return this._monthsShortStrictRegex && isStrict ? this._monthsShortStrictRegex : this._monthsShortRegex;
    }
  }
  function monthsRegex(isStrict) {
    if (this._monthsParseExact) {
      if (!hasOwnProp(this, '_monthsRegex')) {
        computeMonthsParse.call(this);
      }
      if (isStrict) {
        return this._monthsStrictRegex;
      } else {
        return this._monthsRegex;
      }
    } else {
      if (!hasOwnProp(this, '_monthsRegex')) {
        this._monthsRegex = defaultMonthsRegex;
      }
      return this._monthsStrictRegex && isStrict ? this._monthsStrictRegex : this._monthsRegex;
    }
  }
  function computeMonthsParse() {
    function cmpLenRev(a, b) {
      return b.length - a.length;
    }
    var shortPieces = [],
      longPieces = [],
      mixedPieces = [],
      i,
      mom,
      shortP,
      longP;
    for (i = 0; i < 12; i++) {
      // make the regex if we don't have it already
      mom = createUTC([2000, i]);
      shortP = regexEscape(this.monthsShort(mom, ''));
      longP = regexEscape(this.months(mom, ''));
      shortPieces.push(shortP);
      longPieces.push(longP);
      mixedPieces.push(longP);
      mixedPieces.push(shortP);
    }
    // Sorting makes sure if one month (or abbr) is a prefix of another it
    // will match the longer piece.
    shortPieces.sort(cmpLenRev);
    longPieces.sort(cmpLenRev);
    mixedPieces.sort(cmpLenRev);
    this._monthsRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
    this._monthsShortRegex = this._monthsRegex;
    this._monthsStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
    this._monthsShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
  }
  function createDate(y, m, d, h, M, s, ms) {
    // can't just apply() to create a date:
    // https://stackoverflow.com/q/181348
    var date;
    // the date constructor remaps years 0-99 to 1900-1999
    if (y < 100 && y >= 0) {
      // preserve leap years using a full 400 year cycle, then reset
      date = new Date(y + 400, m, d, h, M, s, ms);
      if (isFinite(date.getFullYear())) {
        date.setFullYear(y);
      }
    } else {
      date = new Date(y, m, d, h, M, s, ms);
    }
    return date;
  }
  function createUTCDate(y) {
    var date, args;
    // the Date.UTC function remaps years 0-99 to 1900-1999
    if (y < 100 && y >= 0) {
      args = Array.prototype.slice.call(arguments);
      // preserve leap years using a full 400 year cycle, then reset
      args[0] = y + 400;
      date = new Date(Date.UTC.apply(null, args));
      if (isFinite(date.getUTCFullYear())) {
        date.setUTCFullYear(y);
      }
    } else {
      date = new Date(Date.UTC.apply(null, arguments));
    }
    return date;
  }

  // start-of-first-week - start-of-year
  function firstWeekOffset(year, dow, doy) {
    var
      // first-week day -- which january is always in the first week (4 for iso, 1 for other)
      fwd = 7 + dow - doy,
      // first-week day local weekday -- which local weekday is fwd
      fwdlw = (7 + createUTCDate(year, 0, fwd).getUTCDay() - dow) % 7;
    return -fwdlw + fwd - 1;
  }

  // https://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
  function dayOfYearFromWeeks(year, week, weekday, dow, doy) {
    var localWeekday = (7 + weekday - dow) % 7,
      weekOffset = firstWeekOffset(year, dow, doy),
      dayOfYear = 1 + 7 * (week - 1) + localWeekday + weekOffset,
      resYear,
      resDayOfYear;
    if (dayOfYear <= 0) {
      resYear = year - 1;
      resDayOfYear = daysInYear(resYear) + dayOfYear;
    } else if (dayOfYear > daysInYear(year)) {
      resYear = year + 1;
      resDayOfYear = dayOfYear - daysInYear(year);
    } else {
      resYear = year;
      resDayOfYear = dayOfYear;
    }
    return {
      year: resYear,
      dayOfYear: resDayOfYear
    };
  }
  function weekOfYear(mom, dow, doy) {
    var weekOffset = firstWeekOffset(mom.year(), dow, doy),
      week = Math.floor((mom.dayOfYear() - weekOffset - 1) / 7) + 1,
      resWeek,
      resYear;
    if (week < 1) {
      resYear = mom.year() - 1;
      resWeek = week + weeksInYear(resYear, dow, doy);
    } else if (week > weeksInYear(mom.year(), dow, doy)) {
      resWeek = week - weeksInYear(mom.year(), dow, doy);
      resYear = mom.year() + 1;
    } else {
      resYear = mom.year();
      resWeek = week;
    }
    return {
      week: resWeek,
      year: resYear
    };
  }
  function weeksInYear(year, dow, doy) {
    var weekOffset = firstWeekOffset(year, dow, doy),
      weekOffsetNext = firstWeekOffset(year + 1, dow, doy);
    return (daysInYear(year) - weekOffset + weekOffsetNext) / 7;
  }

  // FORMATTING

  addFormatToken('w', ['ww', 2], 'wo', 'week');
  addFormatToken('W', ['WW', 2], 'Wo', 'isoWeek');

  // PARSING

  addRegexToken('w', match1to2, match1to2NoLeadingZero);
  addRegexToken('ww', match1to2, match2);
  addRegexToken('W', match1to2, match1to2NoLeadingZero);
  addRegexToken('WW', match1to2, match2);
  addWeekParseToken(['w', 'ww', 'W', 'WW'], function (input, week, config, token) {
    week[token.substr(0, 1)] = toInt(input);
  });

  // HELPERS

  // LOCALES

  function localeWeek(mom) {
    return weekOfYear(mom, this._week.dow, this._week.doy).week;
  }
  var defaultLocaleWeek = {
    dow: 0,
    // Sunday is the first day of the week.
    doy: 6 // The week that contains Jan 6th is the first week of the year.
  };
  function localeFirstDayOfWeek() {
    return this._week.dow;
  }
  function localeFirstDayOfYear() {
    return this._week.doy;
  }

  // MOMENTS

  function getSetWeek(input) {
    var week = this.localeData().week(this);
    return input == null ? week : this.add((input - week) * 7, 'd');
  }
  function getSetISOWeek(input) {
    var week = weekOfYear(this, 1, 4).week;
    return input == null ? week : this.add((input - week) * 7, 'd');
  }

  // FORMATTING

  addFormatToken('d', 0, 'do', 'day');
  addFormatToken('dd', 0, 0, function (format) {
    return this.localeData().weekdaysMin(this, format);
  });
  addFormatToken('ddd', 0, 0, function (format) {
    return this.localeData().weekdaysShort(this, format);
  });
  addFormatToken('dddd', 0, 0, function (format) {
    return this.localeData().weekdays(this, format);
  });
  addFormatToken('e', 0, 0, 'weekday');
  addFormatToken('E', 0, 0, 'isoWeekday');

  // PARSING

  addRegexToken('d', match1to2);
  addRegexToken('e', match1to2);
  addRegexToken('E', match1to2);
  addRegexToken('dd', function (isStrict, locale) {
    return locale.weekdaysMinRegex(isStrict);
  });
  addRegexToken('ddd', function (isStrict, locale) {
    return locale.weekdaysShortRegex(isStrict);
  });
  addRegexToken('dddd', function (isStrict, locale) {
    return locale.weekdaysRegex(isStrict);
  });
  addWeekParseToken(['dd', 'ddd', 'dddd'], function (input, week, config, token) {
    var weekday = config._locale.weekdaysParse(input, token, config._strict);
    // if we didn't get a weekday name, mark the date as invalid
    if (weekday != null) {
      week.d = weekday;
    } else {
      getParsingFlags(config).invalidWeekday = input;
    }
  });
  addWeekParseToken(['d', 'e', 'E'], function (input, week, config, token) {
    week[token] = toInt(input);
  });

  // HELPERS

  function parseWeekday(input, locale) {
    if (typeof input !== 'string') {
      return input;
    }
    if (!isNaN(input)) {
      return parseInt(input, 10);
    }
    input = locale.weekdaysParse(input);
    if (typeof input === 'number') {
      return input;
    }
    return null;
  }
  function parseIsoWeekday(input, locale) {
    if (typeof input === 'string') {
      return locale.weekdaysParse(input) % 7 || 7;
    }
    return isNaN(input) ? null : input;
  }

  // LOCALES
  function shiftWeekdays(ws, n) {
    return ws.slice(n, 7).concat(ws.slice(0, n));
  }
  var defaultLocaleWeekdays = 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
    defaultLocaleWeekdaysShort = 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
    defaultLocaleWeekdaysMin = 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
    defaultWeekdaysRegex = matchWord,
    defaultWeekdaysShortRegex = matchWord,
    defaultWeekdaysMinRegex = matchWord;
  function localeWeekdays(m, format) {
    var weekdays = isArray(this._weekdays) ? this._weekdays : this._weekdays[m && m !== true && this._weekdays.isFormat.test(format) ? 'format' : 'standalone'];
    return m === true ? shiftWeekdays(weekdays, this._week.dow) : m ? weekdays[m.day()] : weekdays;
  }
  function localeWeekdaysShort(m) {
    return m === true ? shiftWeekdays(this._weekdaysShort, this._week.dow) : m ? this._weekdaysShort[m.day()] : this._weekdaysShort;
  }
  function localeWeekdaysMin(m) {
    return m === true ? shiftWeekdays(this._weekdaysMin, this._week.dow) : m ? this._weekdaysMin[m.day()] : this._weekdaysMin;
  }
  function handleStrictParse$1(weekdayName, format, strict) {
    var i,
      ii,
      mom,
      llc = weekdayName.toLocaleLowerCase();
    if (!this._weekdaysParse) {
      this._weekdaysParse = [];
      this._shortWeekdaysParse = [];
      this._minWeekdaysParse = [];
      for (i = 0; i < 7; ++i) {
        mom = createUTC([2000, 1]).day(i);
        this._minWeekdaysParse[i] = this.weekdaysMin(mom, '').toLocaleLowerCase();
        this._shortWeekdaysParse[i] = this.weekdaysShort(mom, '').toLocaleLowerCase();
        this._weekdaysParse[i] = this.weekdays(mom, '').toLocaleLowerCase();
      }
    }
    if (strict) {
      if (format === 'dddd') {
        ii = indexOf.call(this._weekdaysParse, llc);
        return ii !== -1 ? ii : null;
      } else if (format === 'ddd') {
        ii = indexOf.call(this._shortWeekdaysParse, llc);
        return ii !== -1 ? ii : null;
      } else {
        ii = indexOf.call(this._minWeekdaysParse, llc);
        return ii !== -1 ? ii : null;
      }
    } else {
      if (format === 'dddd') {
        ii = indexOf.call(this._weekdaysParse, llc);
        if (ii !== -1) {
          return ii;
        }
        ii = indexOf.call(this._shortWeekdaysParse, llc);
        if (ii !== -1) {
          return ii;
        }
        ii = indexOf.call(this._minWeekdaysParse, llc);
        return ii !== -1 ? ii : null;
      } else if (format === 'ddd') {
        ii = indexOf.call(this._shortWeekdaysParse, llc);
        if (ii !== -1) {
          return ii;
        }
        ii = indexOf.call(this._weekdaysParse, llc);
        if (ii !== -1) {
          return ii;
        }
        ii = indexOf.call(this._minWeekdaysParse, llc);
        return ii !== -1 ? ii : null;
      } else {
        ii = indexOf.call(this._minWeekdaysParse, llc);
        if (ii !== -1) {
          return ii;
        }
        ii = indexOf.call(this._weekdaysParse, llc);
        if (ii !== -1) {
          return ii;
        }
        ii = indexOf.call(this._shortWeekdaysParse, llc);
        return ii !== -1 ? ii : null;
      }
    }
  }
  function localeWeekdaysParse(weekdayName, format, strict) {
    var i, mom, regex;
    if (this._weekdaysParseExact) {
      return handleStrictParse$1.call(this, weekdayName, format, strict);
    }
    if (!this._weekdaysParse) {
      this._weekdaysParse = [];
      this._minWeekdaysParse = [];
      this._shortWeekdaysParse = [];
      this._fullWeekdaysParse = [];
    }
    for (i = 0; i < 7; i++) {
      // make the regex if we don't have it already

      mom = createUTC([2000, 1]).day(i);
      if (strict && !this._fullWeekdaysParse[i]) {
        this._fullWeekdaysParse[i] = new RegExp('^' + this.weekdays(mom, '').replace('.', '\\.?') + '$', 'i');
        this._shortWeekdaysParse[i] = new RegExp('^' + this.weekdaysShort(mom, '').replace('.', '\\.?') + '$', 'i');
        this._minWeekdaysParse[i] = new RegExp('^' + this.weekdaysMin(mom, '').replace('.', '\\.?') + '$', 'i');
      }
      if (!this._weekdaysParse[i]) {
        regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
        this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
      }
      // test the regex
      if (strict && format === 'dddd' && this._fullWeekdaysParse[i].test(weekdayName)) {
        return i;
      } else if (strict && format === 'ddd' && this._shortWeekdaysParse[i].test(weekdayName)) {
        return i;
      } else if (strict && format === 'dd' && this._minWeekdaysParse[i].test(weekdayName)) {
        return i;
      } else if (!strict && this._weekdaysParse[i].test(weekdayName)) {
        return i;
      }
    }
  }

  // MOMENTS

  function getSetDayOfWeek(input) {
    if (!this.isValid()) {
      return input != null ? this : NaN;
    }
    var day = get(this, 'Day');
    if (input != null) {
      input = parseWeekday(input, this.localeData());
      return this.add(input - day, 'd');
    } else {
      return day;
    }
  }
  function getSetLocaleDayOfWeek(input) {
    if (!this.isValid()) {
      return input != null ? this : NaN;
    }
    var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
    return input == null ? weekday : this.add(input - weekday, 'd');
  }
  function getSetISODayOfWeek(input) {
    if (!this.isValid()) {
      return input != null ? this : NaN;
    }

    // behaves the same as moment#day except
    // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
    // as a setter, sunday should belong to the previous week.

    if (input != null) {
      var weekday = parseIsoWeekday(input, this.localeData());
      return this.day(this.day() % 7 ? weekday : weekday - 7);
    } else {
      return this.day() || 7;
    }
  }
  function weekdaysRegex(isStrict) {
    if (this._weekdaysParseExact) {
      if (!hasOwnProp(this, '_weekdaysRegex')) {
        computeWeekdaysParse.call(this);
      }
      if (isStrict) {
        return this._weekdaysStrictRegex;
      } else {
        return this._weekdaysRegex;
      }
    } else {
      if (!hasOwnProp(this, '_weekdaysRegex')) {
        this._weekdaysRegex = defaultWeekdaysRegex;
      }
      return this._weekdaysStrictRegex && isStrict ? this._weekdaysStrictRegex : this._weekdaysRegex;
    }
  }
  function weekdaysShortRegex(isStrict) {
    if (this._weekdaysParseExact) {
      if (!hasOwnProp(this, '_weekdaysRegex')) {
        computeWeekdaysParse.call(this);
      }
      if (isStrict) {
        return this._weekdaysShortStrictRegex;
      } else {
        return this._weekdaysShortRegex;
      }
    } else {
      if (!hasOwnProp(this, '_weekdaysShortRegex')) {
        this._weekdaysShortRegex = defaultWeekdaysShortRegex;
      }
      return this._weekdaysShortStrictRegex && isStrict ? this._weekdaysShortStrictRegex : this._weekdaysShortRegex;
    }
  }
  function weekdaysMinRegex(isStrict) {
    if (this._weekdaysParseExact) {
      if (!hasOwnProp(this, '_weekdaysRegex')) {
        computeWeekdaysParse.call(this);
      }
      if (isStrict) {
        return this._weekdaysMinStrictRegex;
      } else {
        return this._weekdaysMinRegex;
      }
    } else {
      if (!hasOwnProp(this, '_weekdaysMinRegex')) {
        this._weekdaysMinRegex = defaultWeekdaysMinRegex;
      }
      return this._weekdaysMinStrictRegex && isStrict ? this._weekdaysMinStrictRegex : this._weekdaysMinRegex;
    }
  }
  function computeWeekdaysParse() {
    function cmpLenRev(a, b) {
      return b.length - a.length;
    }
    var minPieces = [],
      shortPieces = [],
      longPieces = [],
      mixedPieces = [],
      i,
      mom,
      minp,
      shortp,
      longp;
    for (i = 0; i < 7; i++) {
      // make the regex if we don't have it already
      mom = createUTC([2000, 1]).day(i);
      minp = regexEscape(this.weekdaysMin(mom, ''));
      shortp = regexEscape(this.weekdaysShort(mom, ''));
      longp = regexEscape(this.weekdays(mom, ''));
      minPieces.push(minp);
      shortPieces.push(shortp);
      longPieces.push(longp);
      mixedPieces.push(minp);
      mixedPieces.push(shortp);
      mixedPieces.push(longp);
    }
    // Sorting makes sure if one weekday (or abbr) is a prefix of another it
    // will match the longer piece.
    minPieces.sort(cmpLenRev);
    shortPieces.sort(cmpLenRev);
    longPieces.sort(cmpLenRev);
    mixedPieces.sort(cmpLenRev);
    this._weekdaysRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
    this._weekdaysShortRegex = this._weekdaysRegex;
    this._weekdaysMinRegex = this._weekdaysRegex;
    this._weekdaysStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
    this._weekdaysShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
    this._weekdaysMinStrictRegex = new RegExp('^(' + minPieces.join('|') + ')', 'i');
  }

  // FORMATTING

  function hFormat() {
    return this.hours() % 12 || 12;
  }
  function kFormat() {
    return this.hours() || 24;
  }
  addFormatToken('H', ['HH', 2], 0, 'hour');
  addFormatToken('h', ['hh', 2], 0, hFormat);
  addFormatToken('k', ['kk', 2], 0, kFormat);
  addFormatToken('hmm', 0, 0, function () {
    return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2);
  });
  addFormatToken('hmmss', 0, 0, function () {
    return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2) + zeroFill(this.seconds(), 2);
  });
  addFormatToken('Hmm', 0, 0, function () {
    return '' + this.hours() + zeroFill(this.minutes(), 2);
  });
  addFormatToken('Hmmss', 0, 0, function () {
    return '' + this.hours() + zeroFill(this.minutes(), 2) + zeroFill(this.seconds(), 2);
  });
  function meridiem(token, lowercase) {
    addFormatToken(token, 0, 0, function () {
      return this.localeData().meridiem(this.hours(), this.minutes(), lowercase);
    });
  }
  meridiem('a', true);
  meridiem('A', false);

  // PARSING

  function matchMeridiem(isStrict, locale) {
    return locale._meridiemParse;
  }
  addRegexToken('a', matchMeridiem);
  addRegexToken('A', matchMeridiem);
  addRegexToken('H', match1to2, match1to2HasZero);
  addRegexToken('h', match1to2, match1to2NoLeadingZero);
  addRegexToken('k', match1to2, match1to2NoLeadingZero);
  addRegexToken('HH', match1to2, match2);
  addRegexToken('hh', match1to2, match2);
  addRegexToken('kk', match1to2, match2);
  addRegexToken('hmm', match3to4);
  addRegexToken('hmmss', match5to6);
  addRegexToken('Hmm', match3to4);
  addRegexToken('Hmmss', match5to6);
  addParseToken(['H', 'HH'], HOUR);
  addParseToken(['k', 'kk'], function (input, array, config) {
    var kInput = toInt(input);
    array[HOUR] = kInput === 24 ? 0 : kInput;
  });
  addParseToken(['a', 'A'], function (input, array, config) {
    config._isPm = config._locale.isPM(input);
    config._meridiem = input;
  });
  addParseToken(['h', 'hh'], function (input, array, config) {
    array[HOUR] = toInt(input);
    getParsingFlags(config).bigHour = true;
  });
  addParseToken('hmm', function (input, array, config) {
    var pos = input.length - 2;
    array[HOUR] = toInt(input.substr(0, pos));
    array[MINUTE] = toInt(input.substr(pos));
    getParsingFlags(config).bigHour = true;
  });
  addParseToken('hmmss', function (input, array, config) {
    var pos1 = input.length - 4,
      pos2 = input.length - 2;
    array[HOUR] = toInt(input.substr(0, pos1));
    array[MINUTE] = toInt(input.substr(pos1, 2));
    array[SECOND] = toInt(input.substr(pos2));
    getParsingFlags(config).bigHour = true;
  });
  addParseToken('Hmm', function (input, array, config) {
    var pos = input.length - 2;
    array[HOUR] = toInt(input.substr(0, pos));
    array[MINUTE] = toInt(input.substr(pos));
  });
  addParseToken('Hmmss', function (input, array, config) {
    var pos1 = input.length - 4,
      pos2 = input.length - 2;
    array[HOUR] = toInt(input.substr(0, pos1));
    array[MINUTE] = toInt(input.substr(pos1, 2));
    array[SECOND] = toInt(input.substr(pos2));
  });

  // LOCALES

  function localeIsPM(input) {
    // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
    // Using charAt should be more compatible.
    return (input + '').toLowerCase().charAt(0) === 'p';
  }
  var defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i,
    // Setting the hour should keep the time, because the user explicitly
    // specified which hour they want. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    getSetHour = makeGetSet('Hours', true);
  function localeMeridiem(hours, minutes, isLower) {
    if (hours > 11) {
      return isLower ? 'pm' : 'PM';
    } else {
      return isLower ? 'am' : 'AM';
    }
  }
  var baseConfig = {
    calendar: defaultCalendar,
    longDateFormat: defaultLongDateFormat,
    invalidDate: defaultInvalidDate,
    ordinal: defaultOrdinal,
    dayOfMonthOrdinalParse: defaultDayOfMonthOrdinalParse,
    relativeTime: defaultRelativeTime,
    months: defaultLocaleMonths,
    monthsShort: defaultLocaleMonthsShort,
    week: defaultLocaleWeek,
    weekdays: defaultLocaleWeekdays,
    weekdaysMin: defaultLocaleWeekdaysMin,
    weekdaysShort: defaultLocaleWeekdaysShort,
    meridiemParse: defaultLocaleMeridiemParse
  };

  // internal storage for locale config files
  var locales = {},
    localeFamilies = {},
    globalLocale;
  function commonPrefix(arr1, arr2) {
    var i,
      minl = Math.min(arr1.length, arr2.length);
    for (i = 0; i < minl; i += 1) {
      if (arr1[i] !== arr2[i]) {
        return i;
      }
    }
    return minl;
  }
  function normalizeLocale(key) {
    return key ? key.toLowerCase().replace('_', '-') : key;
  }

  // pick the locale from the array
  // try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
  // substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
  function chooseLocale(names) {
    var i = 0,
      j,
      next,
      locale,
      split;
    while (i < names.length) {
      split = normalizeLocale(names[i]).split('-');
      j = split.length;
      next = normalizeLocale(names[i + 1]);
      next = next ? next.split('-') : null;
      while (j > 0) {
        locale = loadLocale(split.slice(0, j).join('-'));
        if (locale) {
          return locale;
        }
        if (next && next.length >= j && commonPrefix(split, next) >= j - 1) {
          //the next array item is better than a shallower substring of this one
          break;
        }
        j--;
      }
      i++;
    }
    return globalLocale;
  }
  function isLocaleNameSane(name) {
    // Prevent names that look like filesystem paths, i.e contain '/' or '\'
    // Ensure name is available and function returns boolean
    return !!(name && name.match('^[^/\\\\]*$'));
  }
  function loadLocale(name) {
    var oldLocale = null,
      aliasedRequire;
    // TODO: Find a better way to register and load all the locales in Node
    if (locales[name] === undefined && "object" !== 'undefined' && module && module.exports && isLocaleNameSane(name)) {
      try {
        oldLocale = globalLocale._abbr;
        aliasedRequire = undefined;
        Object(function webpackMissingModule() { var e = new Error("Cannot find module 'undefined'"); e.code = 'MODULE_NOT_FOUND'; throw e; }());
        getSetGlobalLocale(oldLocale);
      } catch (e) {
        // mark as not found to avoid repeating expensive file require call causing high CPU
        // when trying to find en-US, en_US, en-us for every format call
        locales[name] = null; // null means not found
      }
    }
    return locales[name];
  }

  // This function will load locale and then set the global locale.  If
  // no arguments are passed in, it will simply return the current global
  // locale key.
  function getSetGlobalLocale(key, values) {
    var data;
    if (key) {
      if (isUndefined(values)) {
        data = getLocale(key);
      } else {
        data = defineLocale(key, values);
      }
      if (data) {
        // moment.duration._locale = moment._locale = data;
        globalLocale = data;
      } else {
        if (typeof console !== 'undefined' && console.warn) {
          //warn user if arguments are passed but the locale could not be set
          console.warn('Locale ' + key + ' not found. Did you forget to load it?');
        }
      }
    }
    return globalLocale._abbr;
  }
  function defineLocale(name, config) {
    if (config !== null) {
      var locale,
        parentConfig = baseConfig;
      config.abbr = name;
      if (locales[name] != null) {
        deprecateSimple('defineLocaleOverride', 'use moment.updateLocale(localeName, config) to change ' + 'an existing locale. moment.defineLocale(localeName, ' + 'config) should only be used for creating a new locale ' + 'See http://momentjs.com/guides/#/warnings/define-locale/ for more info.');
        parentConfig = locales[name]._config;
      } else if (config.parentLocale != null) {
        if (locales[config.parentLocale] != null) {
          parentConfig = locales[config.parentLocale]._config;
        } else {
          locale = loadLocale(config.parentLocale);
          if (locale != null) {
            parentConfig = locale._config;
          } else {
            if (!localeFamilies[config.parentLocale]) {
              localeFamilies[config.parentLocale] = [];
            }
            localeFamilies[config.parentLocale].push({
              name: name,
              config: config
            });
            return null;
          }
        }
      }
      locales[name] = new Locale(mergeConfigs(parentConfig, config));
      if (localeFamilies[name]) {
        localeFamilies[name].forEach(function (x) {
          defineLocale(x.name, x.config);
        });
      }

      // backwards compat for now: also set the locale
      // make sure we set the locale AFTER all child locales have been
      // created, so we won't end up with the child locale set.
      getSetGlobalLocale(name);
      return locales[name];
    } else {
      // useful for testing
      delete locales[name];
      return null;
    }
  }
  function updateLocale(name, config) {
    if (config != null) {
      var locale,
        tmpLocale,
        parentConfig = baseConfig;
      if (locales[name] != null && locales[name].parentLocale != null) {
        // Update existing child locale in-place to avoid memory-leaks
        locales[name].set(mergeConfigs(locales[name]._config, config));
      } else {
        // MERGE
        tmpLocale = loadLocale(name);
        if (tmpLocale != null) {
          parentConfig = tmpLocale._config;
        }
        config = mergeConfigs(parentConfig, config);
        if (tmpLocale == null) {
          // updateLocale is called for creating a new locale
          // Set abbr so it will have a name (getters return
          // undefined otherwise).
          config.abbr = name;
        }
        locale = new Locale(config);
        locale.parentLocale = locales[name];
        locales[name] = locale;
      }

      // backwards compat for now: also set the locale
      getSetGlobalLocale(name);
    } else {
      // pass null for config to unupdate, useful for tests
      if (locales[name] != null) {
        if (locales[name].parentLocale != null) {
          locales[name] = locales[name].parentLocale;
          if (name === getSetGlobalLocale()) {
            getSetGlobalLocale(name);
          }
        } else if (locales[name] != null) {
          delete locales[name];
        }
      }
    }
    return locales[name];
  }

  // returns locale data
  function getLocale(key) {
    var locale;
    if (key && key._locale && key._locale._abbr) {
      key = key._locale._abbr;
    }
    if (!key) {
      return globalLocale;
    }
    if (!isArray(key)) {
      //short-circuit everything else
      locale = loadLocale(key);
      if (locale) {
        return locale;
      }
      key = [key];
    }
    return chooseLocale(key);
  }
  function listLocales() {
    return keys(locales);
  }
  function checkOverflow(m) {
    var overflow,
      a = m._a;
    if (a && getParsingFlags(m).overflow === -2) {
      overflow = a[MONTH] < 0 || a[MONTH] > 11 ? MONTH : a[DATE] < 1 || a[DATE] > daysInMonth(a[YEAR], a[MONTH]) ? DATE : a[HOUR] < 0 || a[HOUR] > 24 || a[HOUR] === 24 && (a[MINUTE] !== 0 || a[SECOND] !== 0 || a[MILLISECOND] !== 0) ? HOUR : a[MINUTE] < 0 || a[MINUTE] > 59 ? MINUTE : a[SECOND] < 0 || a[SECOND] > 59 ? SECOND : a[MILLISECOND] < 0 || a[MILLISECOND] > 999 ? MILLISECOND : -1;
      if (getParsingFlags(m)._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
        overflow = DATE;
      }
      if (getParsingFlags(m)._overflowWeeks && overflow === -1) {
        overflow = WEEK;
      }
      if (getParsingFlags(m)._overflowWeekday && overflow === -1) {
        overflow = WEEKDAY;
      }
      getParsingFlags(m).overflow = overflow;
    }
    return m;
  }

  // iso 8601 regex
  // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
  var extendedIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([+-]\d\d(?::?\d\d)?|\s*Z)?)?$/,
    basicIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d|))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([+-]\d\d(?::?\d\d)?|\s*Z)?)?$/,
    tzRegex = /Z|[+-]\d\d(?::?\d\d)?/,
    isoDates = [['YYYYYY-MM-DD', /[+-]\d{6}-\d\d-\d\d/], ['YYYY-MM-DD', /\d{4}-\d\d-\d\d/], ['GGGG-[W]WW-E', /\d{4}-W\d\d-\d/], ['GGGG-[W]WW', /\d{4}-W\d\d/, false], ['YYYY-DDD', /\d{4}-\d{3}/], ['YYYY-MM', /\d{4}-\d\d/, false], ['YYYYYYMMDD', /[+-]\d{10}/], ['YYYYMMDD', /\d{8}/], ['GGGG[W]WWE', /\d{4}W\d{3}/], ['GGGG[W]WW', /\d{4}W\d{2}/, false], ['YYYYDDD', /\d{7}/], ['YYYYMM', /\d{6}/, false], ['YYYY', /\d{4}/, false]],
    // iso time formats and regexes
    isoTimes = [['HH:mm:ss.SSSS', /\d\d:\d\d:\d\d\.\d+/], ['HH:mm:ss,SSSS', /\d\d:\d\d:\d\d,\d+/], ['HH:mm:ss', /\d\d:\d\d:\d\d/], ['HH:mm', /\d\d:\d\d/], ['HHmmss.SSSS', /\d\d\d\d\d\d\.\d+/], ['HHmmss,SSSS', /\d\d\d\d\d\d,\d+/], ['HHmmss', /\d\d\d\d\d\d/], ['HHmm', /\d\d\d\d/], ['HH', /\d\d/]],
    aspNetJsonRegex = /^\/?Date\((-?\d+)/i,
    // RFC 2822 regex: For details see https://tools.ietf.org/html/rfc2822#section-3.3
    rfc2822 = /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|([+-]\d{4}))$/,
    obsOffsets = {
      UT: 0,
      GMT: 0,
      EDT: -4 * 60,
      EST: -5 * 60,
      CDT: -5 * 60,
      CST: -6 * 60,
      MDT: -6 * 60,
      MST: -7 * 60,
      PDT: -7 * 60,
      PST: -8 * 60
    };

  // date from iso format
  function configFromISO(config) {
    var i,
      l,
      string = config._i,
      match = extendedIsoRegex.exec(string) || basicIsoRegex.exec(string),
      allowTime,
      dateFormat,
      timeFormat,
      tzFormat,
      isoDatesLen = isoDates.length,
      isoTimesLen = isoTimes.length;
    if (match) {
      getParsingFlags(config).iso = true;
      for (i = 0, l = isoDatesLen; i < l; i++) {
        if (isoDates[i][1].exec(match[1])) {
          dateFormat = isoDates[i][0];
          allowTime = isoDates[i][2] !== false;
          break;
        }
      }
      if (dateFormat == null) {
        config._isValid = false;
        return;
      }
      if (match[3]) {
        for (i = 0, l = isoTimesLen; i < l; i++) {
          if (isoTimes[i][1].exec(match[3])) {
            // match[2] should be 'T' or space
            timeFormat = (match[2] || ' ') + isoTimes[i][0];
            break;
          }
        }
        if (timeFormat == null) {
          config._isValid = false;
          return;
        }
      }
      if (!allowTime && timeFormat != null) {
        config._isValid = false;
        return;
      }
      if (match[4]) {
        if (tzRegex.exec(match[4])) {
          tzFormat = 'Z';
        } else {
          config._isValid = false;
          return;
        }
      }
      config._f = dateFormat + (timeFormat || '') + (tzFormat || '');
      configFromStringAndFormat(config);
    } else {
      config._isValid = false;
    }
  }
  function extractFromRFC2822Strings(yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr) {
    var result = [untruncateYear(yearStr), defaultLocaleMonthsShort.indexOf(monthStr), parseInt(dayStr, 10), parseInt(hourStr, 10), parseInt(minuteStr, 10)];
    if (secondStr) {
      result.push(parseInt(secondStr, 10));
    }
    return result;
  }
  function untruncateYear(yearStr) {
    var year = parseInt(yearStr, 10);
    if (year <= 49) {
      return 2000 + year;
    } else if (year <= 999) {
      return 1900 + year;
    }
    return year;
  }
  function preprocessRFC2822(s) {
    // Remove comments and folding whitespace and replace multiple-spaces with a single space
    return s.replace(/\([^()]*\)|[\n\t]/g, ' ').replace(/(\s\s+)/g, ' ').replace(/^\s\s*/, '').replace(/\s\s*$/, '');
  }
  function checkWeekday(weekdayStr, parsedInput, config) {
    if (weekdayStr) {
      // TODO: Replace the vanilla JS Date object with an independent day-of-week check.
      var weekdayProvided = defaultLocaleWeekdaysShort.indexOf(weekdayStr),
        weekdayActual = new Date(parsedInput[0], parsedInput[1], parsedInput[2]).getDay();
      if (weekdayProvided !== weekdayActual) {
        getParsingFlags(config).weekdayMismatch = true;
        config._isValid = false;
        return false;
      }
    }
    return true;
  }
  function calculateOffset(obsOffset, militaryOffset, numOffset) {
    if (obsOffset) {
      return obsOffsets[obsOffset];
    } else if (militaryOffset) {
      // the only allowed military tz is Z
      return 0;
    } else {
      var hm = parseInt(numOffset, 10),
        m = hm % 100,
        h = (hm - m) / 100;
      return h * 60 + m;
    }
  }

  // date and time from ref 2822 format
  function configFromRFC2822(config) {
    var match = rfc2822.exec(preprocessRFC2822(config._i)),
      parsedArray;
    if (match) {
      parsedArray = extractFromRFC2822Strings(match[4], match[3], match[2], match[5], match[6], match[7]);
      if (!checkWeekday(match[1], parsedArray, config)) {
        return;
      }
      config._a = parsedArray;
      config._tzm = calculateOffset(match[8], match[9], match[10]);
      config._d = createUTCDate.apply(null, config._a);
      config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
      getParsingFlags(config).rfc2822 = true;
    } else {
      config._isValid = false;
    }
  }

  // date from 1) ASP.NET, 2) ISO, 3) RFC 2822 formats, or 4) optional fallback if parsing isn't strict
  function configFromString(config) {
    var matched = aspNetJsonRegex.exec(config._i);
    if (matched !== null) {
      config._d = new Date(+matched[1]);
      return;
    }
    configFromISO(config);
    if (config._isValid === false) {
      delete config._isValid;
    } else {
      return;
    }
    configFromRFC2822(config);
    if (config._isValid === false) {
      delete config._isValid;
    } else {
      return;
    }
    if (config._strict) {
      config._isValid = false;
    } else {
      // Final attempt, use Input Fallback
      hooks.createFromInputFallback(config);
    }
  }
  hooks.createFromInputFallback = deprecate('value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), ' + 'which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are ' + 'discouraged. Please refer to http://momentjs.com/guides/#/warnings/js-date/ for more info.', function (config) {
    config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
  });

  // Pick the first defined of two or three arguments.
  function defaults(a, b, c) {
    if (a != null) {
      return a;
    }
    if (b != null) {
      return b;
    }
    return c;
  }
  function currentDateArray(config) {
    // hooks is actually the exported moment object
    var nowValue = new Date(hooks.now());
    if (config._useUTC) {
      return [nowValue.getUTCFullYear(), nowValue.getUTCMonth(), nowValue.getUTCDate()];
    }
    return [nowValue.getFullYear(), nowValue.getMonth(), nowValue.getDate()];
  }

  // convert an array to a date.
  // the array should mirror the parameters below
  // note: all values past the year are optional and will default to the lowest possible value.
  // [year, month, day , hour, minute, second, millisecond]
  function configFromArray(config) {
    var i,
      date,
      input = [],
      currentDate,
      expectedWeekday,
      yearToUse;
    if (config._d) {
      return;
    }
    currentDate = currentDateArray(config);

    //compute day of the year from weeks and weekdays
    if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
      dayOfYearFromWeekInfo(config);
    }

    //if the day of the year is set, figure out what it is
    if (config._dayOfYear != null) {
      yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);
      if (config._dayOfYear > daysInYear(yearToUse) || config._dayOfYear === 0) {
        getParsingFlags(config)._overflowDayOfYear = true;
      }
      date = createUTCDate(yearToUse, 0, config._dayOfYear);
      config._a[MONTH] = date.getUTCMonth();
      config._a[DATE] = date.getUTCDate();
    }

    // Default to current date.
    // * if no year, month, day of month are given, default to today
    // * if day of month is given, default month and year
    // * if month is given, default only year
    // * if year is given, don't default anything
    for (i = 0; i < 3 && config._a[i] == null; ++i) {
      config._a[i] = input[i] = currentDate[i];
    }

    // Zero out whatever was not defaulted, including time
    for (; i < 7; i++) {
      config._a[i] = input[i] = config._a[i] == null ? i === 2 ? 1 : 0 : config._a[i];
    }

    // Check for 24:00:00.000
    if (config._a[HOUR] === 24 && config._a[MINUTE] === 0 && config._a[SECOND] === 0 && config._a[MILLISECOND] === 0) {
      config._nextDay = true;
      config._a[HOUR] = 0;
    }
    config._d = (config._useUTC ? createUTCDate : createDate).apply(null, input);
    expectedWeekday = config._useUTC ? config._d.getUTCDay() : config._d.getDay();

    // Apply timezone offset from input. The actual utcOffset can be changed
    // with parseZone.
    if (config._tzm != null) {
      config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
    }
    if (config._nextDay) {
      config._a[HOUR] = 24;
    }

    // check for mismatching day of week
    if (config._w && typeof config._w.d !== 'undefined' && config._w.d !== expectedWeekday) {
      getParsingFlags(config).weekdayMismatch = true;
    }
  }
  function dayOfYearFromWeekInfo(config) {
    var w, weekYear, week, weekday, dow, doy, temp, weekdayOverflow, curWeek;
    w = config._w;
    if (w.GG != null || w.W != null || w.E != null) {
      dow = 1;
      doy = 4;

      // TODO: We need to take the current isoWeekYear, but that depends on
      // how we interpret now (local, utc, fixed offset). So create
      // a now version of current config (take local/utc/offset flags, and
      // create now).
      weekYear = defaults(w.GG, config._a[YEAR], weekOfYear(createLocal(), 1, 4).year);
      week = defaults(w.W, 1);
      weekday = defaults(w.E, 1);
      if (weekday < 1 || weekday > 7) {
        weekdayOverflow = true;
      }
    } else {
      dow = config._locale._week.dow;
      doy = config._locale._week.doy;
      curWeek = weekOfYear(createLocal(), dow, doy);
      weekYear = defaults(w.gg, config._a[YEAR], curWeek.year);

      // Default to current week.
      week = defaults(w.w, curWeek.week);
      if (w.d != null) {
        // weekday -- low day numbers are considered next week
        weekday = w.d;
        if (weekday < 0 || weekday > 6) {
          weekdayOverflow = true;
        }
      } else if (w.e != null) {
        // local weekday -- counting starts from beginning of week
        weekday = w.e + dow;
        if (w.e < 0 || w.e > 6) {
          weekdayOverflow = true;
        }
      } else {
        // default to beginning of week
        weekday = dow;
      }
    }
    if (week < 1 || week > weeksInYear(weekYear, dow, doy)) {
      getParsingFlags(config)._overflowWeeks = true;
    } else if (weekdayOverflow != null) {
      getParsingFlags(config)._overflowWeekday = true;
    } else {
      temp = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy);
      config._a[YEAR] = temp.year;
      config._dayOfYear = temp.dayOfYear;
    }
  }

  // constant that refers to the ISO standard
  hooks.ISO_8601 = function () {};

  // constant that refers to the RFC 2822 form
  hooks.RFC_2822 = function () {};

  // date from string and format string
  function configFromStringAndFormat(config) {
    // TODO: Move this to another part of the creation flow to prevent circular deps
    if (config._f === hooks.ISO_8601) {
      configFromISO(config);
      return;
    }
    if (config._f === hooks.RFC_2822) {
      configFromRFC2822(config);
      return;
    }
    config._a = [];
    getParsingFlags(config).empty = true;

    // This array is used to make a Date, either with `new Date` or `Date.UTC`
    var string = '' + config._i,
      i,
      parsedInput,
      tokens,
      token,
      skipped,
      stringLength = string.length,
      totalParsedInputLength = 0,
      era,
      tokenLen;
    tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];
    tokenLen = tokens.length;
    for (i = 0; i < tokenLen; i++) {
      token = tokens[i];
      parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
      if (parsedInput) {
        skipped = string.substr(0, string.indexOf(parsedInput));
        if (skipped.length > 0) {
          getParsingFlags(config).unusedInput.push(skipped);
        }
        string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
        totalParsedInputLength += parsedInput.length;
      }
      // don't parse if it's not a known token
      if (formatTokenFunctions[token]) {
        if (parsedInput) {
          getParsingFlags(config).empty = false;
        } else {
          getParsingFlags(config).unusedTokens.push(token);
        }
        addTimeToArrayFromToken(token, parsedInput, config);
      } else if (config._strict && !parsedInput) {
        getParsingFlags(config).unusedTokens.push(token);
      }
    }

    // add remaining unparsed input length to the string
    getParsingFlags(config).charsLeftOver = stringLength - totalParsedInputLength;
    if (string.length > 0) {
      getParsingFlags(config).unusedInput.push(string);
    }

    // clear _12h flag if hour is <= 12
    if (config._a[HOUR] <= 12 && getParsingFlags(config).bigHour === true && config._a[HOUR] > 0) {
      getParsingFlags(config).bigHour = undefined;
    }
    getParsingFlags(config).parsedDateParts = config._a.slice(0);
    getParsingFlags(config).meridiem = config._meridiem;
    // handle meridiem
    config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR], config._meridiem);

    // handle era
    era = getParsingFlags(config).era;
    if (era !== null) {
      config._a[YEAR] = config._locale.erasConvertYear(era, config._a[YEAR]);
    }
    configFromArray(config);
    checkOverflow(config);
  }
  function meridiemFixWrap(locale, hour, meridiem) {
    var isPm;
    if (meridiem == null) {
      // nothing to do
      return hour;
    }
    if (locale.meridiemHour != null) {
      return locale.meridiemHour(hour, meridiem);
    } else if (locale.isPM != null) {
      // Fallback
      isPm = locale.isPM(meridiem);
      if (isPm && hour < 12) {
        hour += 12;
      }
      if (!isPm && hour === 12) {
        hour = 0;
      }
      return hour;
    } else {
      // this is not supposed to happen
      return hour;
    }
  }

  // date from string and array of format strings
  function configFromStringAndArray(config) {
    var tempConfig,
      bestMoment,
      scoreToBeat,
      i,
      currentScore,
      validFormatFound,
      bestFormatIsValid = false,
      configfLen = config._f.length;
    if (configfLen === 0) {
      getParsingFlags(config).invalidFormat = true;
      config._d = new Date(NaN);
      return;
    }
    for (i = 0; i < configfLen; i++) {
      currentScore = 0;
      validFormatFound = false;
      tempConfig = copyConfig({}, config);
      if (config._useUTC != null) {
        tempConfig._useUTC = config._useUTC;
      }
      tempConfig._f = config._f[i];
      configFromStringAndFormat(tempConfig);
      if (isValid(tempConfig)) {
        validFormatFound = true;
      }

      // if there is any input that was not parsed add a penalty for that format
      currentScore += getParsingFlags(tempConfig).charsLeftOver;

      //or tokens
      currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;
      getParsingFlags(tempConfig).score = currentScore;
      if (!bestFormatIsValid) {
        if (scoreToBeat == null || currentScore < scoreToBeat || validFormatFound) {
          scoreToBeat = currentScore;
          bestMoment = tempConfig;
          if (validFormatFound) {
            bestFormatIsValid = true;
          }
        }
      } else {
        if (currentScore < scoreToBeat) {
          scoreToBeat = currentScore;
          bestMoment = tempConfig;
        }
      }
    }
    extend(config, bestMoment || tempConfig);
  }
  function configFromObject(config) {
    if (config._d) {
      return;
    }
    var i = normalizeObjectUnits(config._i),
      dayOrDate = i.day === undefined ? i.date : i.day;
    config._a = map([i.year, i.month, dayOrDate, i.hour, i.minute, i.second, i.millisecond], function (obj) {
      return obj && parseInt(obj, 10);
    });
    configFromArray(config);
  }
  function createFromConfig(config) {
    var res = new Moment(checkOverflow(prepareConfig(config)));
    if (res._nextDay) {
      // Adding is smart enough around DST
      res.add(1, 'd');
      res._nextDay = undefined;
    }
    return res;
  }
  function prepareConfig(config) {
    var input = config._i,
      format = config._f;
    config._locale = config._locale || getLocale(config._l);
    if (input === null || format === undefined && input === '') {
      return createInvalid({
        nullInput: true
      });
    }
    if (typeof input === 'string') {
      config._i = input = config._locale.preparse(input);
    }
    if (isMoment(input)) {
      return new Moment(checkOverflow(input));
    } else if (isDate(input)) {
      config._d = input;
    } else if (isArray(format)) {
      configFromStringAndArray(config);
    } else if (format) {
      configFromStringAndFormat(config);
    } else {
      configFromInput(config);
    }
    if (!isValid(config)) {
      config._d = null;
    }
    return config;
  }
  function configFromInput(config) {
    var input = config._i;
    if (isUndefined(input)) {
      config._d = new Date(hooks.now());
    } else if (isDate(input)) {
      config._d = new Date(input.valueOf());
    } else if (typeof input === 'string') {
      configFromString(config);
    } else if (isArray(input)) {
      config._a = map(input.slice(0), function (obj) {
        return parseInt(obj, 10);
      });
      configFromArray(config);
    } else if (isObject(input)) {
      configFromObject(config);
    } else if (isNumber(input)) {
      // from milliseconds
      config._d = new Date(input);
    } else {
      hooks.createFromInputFallback(config);
    }
  }
  function createLocalOrUTC(input, format, locale, strict, isUTC) {
    var c = {};
    if (format === true || format === false) {
      strict = format;
      format = undefined;
    }
    if (locale === true || locale === false) {
      strict = locale;
      locale = undefined;
    }
    if (isObject(input) && isObjectEmpty(input) || isArray(input) && input.length === 0) {
      input = undefined;
    }
    // object construction must be done this way.
    // https://github.com/moment/moment/issues/1423
    c._isAMomentObject = true;
    c._useUTC = c._isUTC = isUTC;
    c._l = locale;
    c._i = input;
    c._f = format;
    c._strict = strict;
    return createFromConfig(c);
  }
  function createLocal(input, format, locale, strict) {
    return createLocalOrUTC(input, format, locale, strict, false);
  }
  var prototypeMin = deprecate('moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/', function () {
      var other = createLocal.apply(null, arguments);
      if (this.isValid() && other.isValid()) {
        return other < this ? this : other;
      } else {
        return createInvalid();
      }
    }),
    prototypeMax = deprecate('moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/', function () {
      var other = createLocal.apply(null, arguments);
      if (this.isValid() && other.isValid()) {
        return other > this ? this : other;
      } else {
        return createInvalid();
      }
    });

  // Pick a moment m from moments so that m[fn](other) is true for all
  // other. This relies on the function fn to be transitive.
  //
  // moments should either be an array of moment objects or an array, whose
  // first element is an array of moment objects.
  function pickBy(fn, moments) {
    var res, i;
    if (moments.length === 1 && isArray(moments[0])) {
      moments = moments[0];
    }
    if (!moments.length) {
      return createLocal();
    }
    res = moments[0];
    for (i = 1; i < moments.length; ++i) {
      if (!moments[i].isValid() || moments[i][fn](res)) {
        res = moments[i];
      }
    }
    return res;
  }

  // TODO: Use [].sort instead?
  function min() {
    var args = [].slice.call(arguments, 0);
    return pickBy('isBefore', args);
  }
  function max() {
    var args = [].slice.call(arguments, 0);
    return pickBy('isAfter', args);
  }
  var now = function () {
    return Date.now ? Date.now() : +new Date();
  };
  var ordering = ['year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond'];
  function isDurationValid(m) {
    var key,
      unitHasDecimal = false,
      i,
      orderLen = ordering.length;
    for (key in m) {
      if (hasOwnProp(m, key) && !(indexOf.call(ordering, key) !== -1 && (m[key] == null || !isNaN(m[key])))) {
        return false;
      }
    }
    for (i = 0; i < orderLen; ++i) {
      if (m[ordering[i]]) {
        if (unitHasDecimal) {
          return false; // only allow non-integers for smallest unit
        }
        if (parseFloat(m[ordering[i]]) !== toInt(m[ordering[i]])) {
          unitHasDecimal = true;
        }
      }
    }
    return true;
  }
  function isValid$1() {
    return this._isValid;
  }
  function createInvalid$1() {
    return createDuration(NaN);
  }
  function Duration(duration) {
    var normalizedInput = normalizeObjectUnits(duration),
      years = normalizedInput.year || 0,
      quarters = normalizedInput.quarter || 0,
      months = normalizedInput.month || 0,
      weeks = normalizedInput.week || normalizedInput.isoWeek || 0,
      days = normalizedInput.day || 0,
      hours = normalizedInput.hour || 0,
      minutes = normalizedInput.minute || 0,
      seconds = normalizedInput.second || 0,
      milliseconds = normalizedInput.millisecond || 0;
    this._isValid = isDurationValid(normalizedInput);

    // representation for dateAddRemove
    this._milliseconds = +milliseconds + seconds * 1e3 +
    // 1000
    minutes * 6e4 +
    // 1000 * 60
    hours * 1000 * 60 * 60; //using 1000 * 60 * 60 instead of 36e5 to avoid floating point rounding errors https://github.com/moment/moment/issues/2978
    // Because of dateAddRemove treats 24 hours as different from a
    // day when working around DST, we need to store them separately
    this._days = +days + weeks * 7;
    // It is impossible to translate months into days without knowing
    // which months you are are talking about, so we have to store
    // it separately.
    this._months = +months + quarters * 3 + years * 12;
    this._data = {};
    this._locale = getLocale();
    this._bubble();
  }
  function isDuration(obj) {
    return obj instanceof Duration;
  }
  function absRound(number) {
    if (number < 0) {
      return Math.round(-1 * number) * -1;
    } else {
      return Math.round(number);
    }
  }

  // compare two arrays, return the number of differences
  function compareArrays(array1, array2, dontConvert) {
    var len = Math.min(array1.length, array2.length),
      lengthDiff = Math.abs(array1.length - array2.length),
      diffs = 0,
      i;
    for (i = 0; i < len; i++) {
      if (dontConvert && array1[i] !== array2[i] || !dontConvert && toInt(array1[i]) !== toInt(array2[i])) {
        diffs++;
      }
    }
    return diffs + lengthDiff;
  }

  // FORMATTING

  function offset(token, separator) {
    addFormatToken(token, 0, 0, function () {
      var offset = this.utcOffset(),
        sign = '+';
      if (offset < 0) {
        offset = -offset;
        sign = '-';
      }
      return sign + zeroFill(~~(offset / 60), 2) + separator + zeroFill(~~offset % 60, 2);
    });
  }
  offset('Z', ':');
  offset('ZZ', '');

  // PARSING

  addRegexToken('Z', matchShortOffset);
  addRegexToken('ZZ', matchShortOffset);
  addParseToken(['Z', 'ZZ'], function (input, array, config) {
    config._useUTC = true;
    config._tzm = offsetFromString(matchShortOffset, input);
  });

  // HELPERS

  // timezone chunker
  // '+10:00' > ['10',  '00']
  // '-1530'  > ['-15', '30']
  var chunkOffset = /([\+\-]|\d\d)/gi;
  function offsetFromString(matcher, string) {
    var matches = (string || '').match(matcher),
      chunk,
      parts,
      minutes;
    if (matches === null) {
      return null;
    }
    chunk = matches[matches.length - 1] || [];
    parts = (chunk + '').match(chunkOffset) || ['-', 0, 0];
    minutes = +(parts[1] * 60) + toInt(parts[2]);
    return minutes === 0 ? 0 : parts[0] === '+' ? minutes : -minutes;
  }

  // Return a moment from input, that is local/utc/zone equivalent to model.
  function cloneWithOffset(input, model) {
    var res, diff;
    if (model._isUTC) {
      res = model.clone();
      diff = (isMoment(input) || isDate(input) ? input.valueOf() : createLocal(input).valueOf()) - res.valueOf();
      // Use low-level api, because this fn is low-level api.
      res._d.setTime(res._d.valueOf() + diff);
      hooks.updateOffset(res, false);
      return res;
    } else {
      return createLocal(input).local();
    }
  }
  function getDateOffset(m) {
    // On Firefox.24 Date#getTimezoneOffset returns a floating point.
    // https://github.com/moment/moment/pull/1871
    return -Math.round(m._d.getTimezoneOffset());
  }

  // HOOKS

  // This function will be called whenever a moment is mutated.
  // It is intended to keep the offset in sync with the timezone.
  hooks.updateOffset = function () {};

  // MOMENTS

  // keepLocalTime = true means only change the timezone, without
  // affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
  // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
  // +0200, so we adjust the time as needed, to be valid.
  //
  // Keeping the time actually adds/subtracts (one hour)
  // from the actual represented time. That is why we call updateOffset
  // a second time. In case it wants us to change the offset again
  // _changeInProgress == true case, then we have to adjust, because
  // there is no such time in the given timezone.
  function getSetOffset(input, keepLocalTime, keepMinutes) {
    var offset = this._offset || 0,
      localAdjust;
    if (!this.isValid()) {
      return input != null ? this : NaN;
    }
    if (input != null) {
      if (typeof input === 'string') {
        input = offsetFromString(matchShortOffset, input);
        if (input === null) {
          return this;
        }
      } else if (Math.abs(input) < 16 && !keepMinutes) {
        input = input * 60;
      }
      if (!this._isUTC && keepLocalTime) {
        localAdjust = getDateOffset(this);
      }
      this._offset = input;
      this._isUTC = true;
      if (localAdjust != null) {
        this.add(localAdjust, 'm');
      }
      if (offset !== input) {
        if (!keepLocalTime || this._changeInProgress) {
          addSubtract(this, createDuration(input - offset, 'm'), 1, false);
        } else if (!this._changeInProgress) {
          this._changeInProgress = true;
          hooks.updateOffset(this, true);
          this._changeInProgress = null;
        }
      }
      return this;
    } else {
      return this._isUTC ? offset : getDateOffset(this);
    }
  }
  function getSetZone(input, keepLocalTime) {
    if (input != null) {
      if (typeof input !== 'string') {
        input = -input;
      }
      this.utcOffset(input, keepLocalTime);
      return this;
    } else {
      return -this.utcOffset();
    }
  }
  function setOffsetToUTC(keepLocalTime) {
    return this.utcOffset(0, keepLocalTime);
  }
  function setOffsetToLocal(keepLocalTime) {
    if (this._isUTC) {
      this.utcOffset(0, keepLocalTime);
      this._isUTC = false;
      if (keepLocalTime) {
        this.subtract(getDateOffset(this), 'm');
      }
    }
    return this;
  }
  function setOffsetToParsedOffset() {
    if (this._tzm != null) {
      this.utcOffset(this._tzm, false, true);
    } else if (typeof this._i === 'string') {
      var tZone = offsetFromString(matchOffset, this._i);
      if (tZone != null) {
        this.utcOffset(tZone);
      } else {
        this.utcOffset(0, true);
      }
    }
    return this;
  }
  function hasAlignedHourOffset(input) {
    if (!this.isValid()) {
      return false;
    }
    input = input ? createLocal(input).utcOffset() : 0;
    return (this.utcOffset() - input) % 60 === 0;
  }
  function isDaylightSavingTime() {
    return this.utcOffset() > this.clone().month(0).utcOffset() || this.utcOffset() > this.clone().month(5).utcOffset();
  }
  function isDaylightSavingTimeShifted() {
    if (!isUndefined(this._isDSTShifted)) {
      return this._isDSTShifted;
    }
    var c = {},
      other;
    copyConfig(c, this);
    c = prepareConfig(c);
    if (c._a) {
      other = c._isUTC ? createUTC(c._a) : createLocal(c._a);
      this._isDSTShifted = this.isValid() && compareArrays(c._a, other.toArray()) > 0;
    } else {
      this._isDSTShifted = false;
    }
    return this._isDSTShifted;
  }
  function isLocal() {
    return this.isValid() ? !this._isUTC : false;
  }
  function isUtcOffset() {
    return this.isValid() ? this._isUTC : false;
  }
  function isUtc() {
    return this.isValid() ? this._isUTC && this._offset === 0 : false;
  }

  // ASP.NET json date format regex
  var aspNetRegex = /^(-|\+)?(?:(\d*)[. ])?(\d+):(\d+)(?::(\d+)(\.\d*)?)?$/,
    // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
    // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
    // and further modified to allow for strings containing both week and day
    isoRegex = /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;
  function createDuration(input, key) {
    var duration = input,
      // matching against regexp is expensive, do it on demand
      match = null,
      sign,
      ret,
      diffRes;
    if (isDuration(input)) {
      duration = {
        ms: input._milliseconds,
        d: input._days,
        M: input._months
      };
    } else if (isNumber(input) || !isNaN(+input)) {
      duration = {};
      if (key) {
        duration[key] = +input;
      } else {
        duration.milliseconds = +input;
      }
    } else if (match = aspNetRegex.exec(input)) {
      sign = match[1] === '-' ? -1 : 1;
      duration = {
        y: 0,
        d: toInt(match[DATE]) * sign,
        h: toInt(match[HOUR]) * sign,
        m: toInt(match[MINUTE]) * sign,
        s: toInt(match[SECOND]) * sign,
        ms: toInt(absRound(match[MILLISECOND] * 1000)) * sign // the millisecond decimal point is included in the match
      };
    } else if (match = isoRegex.exec(input)) {
      sign = match[1] === '-' ? -1 : 1;
      duration = {
        y: parseIso(match[2], sign),
        M: parseIso(match[3], sign),
        w: parseIso(match[4], sign),
        d: parseIso(match[5], sign),
        h: parseIso(match[6], sign),
        m: parseIso(match[7], sign),
        s: parseIso(match[8], sign)
      };
    } else if (duration == null) {
      // checks for null or undefined
      duration = {};
    } else if (typeof duration === 'object' && ('from' in duration || 'to' in duration)) {
      diffRes = momentsDifference(createLocal(duration.from), createLocal(duration.to));
      duration = {};
      duration.ms = diffRes.milliseconds;
      duration.M = diffRes.months;
    }
    ret = new Duration(duration);
    if (isDuration(input) && hasOwnProp(input, '_locale')) {
      ret._locale = input._locale;
    }
    if (isDuration(input) && hasOwnProp(input, '_isValid')) {
      ret._isValid = input._isValid;
    }
    return ret;
  }
  createDuration.fn = Duration.prototype;
  createDuration.invalid = createInvalid$1;
  function parseIso(inp, sign) {
    // We'd normally use ~~inp for this, but unfortunately it also
    // converts floats to ints.
    // inp may be undefined, so careful calling replace on it.
    var res = inp && parseFloat(inp.replace(',', '.'));
    // apply sign while we're at it
    return (isNaN(res) ? 0 : res) * sign;
  }
  function positiveMomentsDifference(base, other) {
    var res = {};
    res.months = other.month() - base.month() + (other.year() - base.year()) * 12;
    if (base.clone().add(res.months, 'M').isAfter(other)) {
      --res.months;
    }
    res.milliseconds = +other - +base.clone().add(res.months, 'M');
    return res;
  }
  function momentsDifference(base, other) {
    var res;
    if (!(base.isValid() && other.isValid())) {
      return {
        milliseconds: 0,
        months: 0
      };
    }
    other = cloneWithOffset(other, base);
    if (base.isBefore(other)) {
      res = positiveMomentsDifference(base, other);
    } else {
      res = positiveMomentsDifference(other, base);
      res.milliseconds = -res.milliseconds;
      res.months = -res.months;
    }
    return res;
  }

  // TODO: remove 'name' arg after deprecation is removed
  function createAdder(direction, name) {
    return function (val, period) {
      var dur, tmp;
      //invert the arguments, but complain about it
      if (period !== null && !isNaN(+period)) {
        deprecateSimple(name, 'moment().' + name + '(period, number) is deprecated. Please use moment().' + name + '(number, period). ' + 'See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info.');
        tmp = val;
        val = period;
        period = tmp;
      }
      dur = createDuration(val, period);
      addSubtract(this, dur, direction);
      return this;
    };
  }
  function addSubtract(mom, duration, isAdding, updateOffset) {
    var milliseconds = duration._milliseconds,
      days = absRound(duration._days),
      months = absRound(duration._months);
    if (!mom.isValid()) {
      // No op
      return;
    }
    updateOffset = updateOffset == null ? true : updateOffset;
    if (months) {
      setMonth(mom, get(mom, 'Month') + months * isAdding);
    }
    if (days) {
      set$1(mom, 'Date', get(mom, 'Date') + days * isAdding);
    }
    if (milliseconds) {
      mom._d.setTime(mom._d.valueOf() + milliseconds * isAdding);
    }
    if (updateOffset) {
      hooks.updateOffset(mom, days || months);
    }
  }
  var add = createAdder(1, 'add'),
    subtract = createAdder(-1, 'subtract');
  function isString(input) {
    return typeof input === 'string' || input instanceof String;
  }

  // type MomentInput = Moment | Date | string | number | (number | string)[] | MomentInputObject | void; // null | undefined
  function isMomentInput(input) {
    return isMoment(input) || isDate(input) || isString(input) || isNumber(input) || isNumberOrStringArray(input) || isMomentInputObject(input) || input === null || input === undefined;
  }
  function isMomentInputObject(input) {
    var objectTest = isObject(input) && !isObjectEmpty(input),
      propertyTest = false,
      properties = ['years', 'year', 'y', 'months', 'month', 'M', 'days', 'day', 'd', 'dates', 'date', 'D', 'hours', 'hour', 'h', 'minutes', 'minute', 'm', 'seconds', 'second', 's', 'milliseconds', 'millisecond', 'ms'],
      i,
      property,
      propertyLen = properties.length;
    for (i = 0; i < propertyLen; i += 1) {
      property = properties[i];
      propertyTest = propertyTest || hasOwnProp(input, property);
    }
    return objectTest && propertyTest;
  }
  function isNumberOrStringArray(input) {
    var arrayTest = isArray(input),
      dataTypeTest = false;
    if (arrayTest) {
      dataTypeTest = input.filter(function (item) {
        return !isNumber(item) && isString(input);
      }).length === 0;
    }
    return arrayTest && dataTypeTest;
  }
  function isCalendarSpec(input) {
    var objectTest = isObject(input) && !isObjectEmpty(input),
      propertyTest = false,
      properties = ['sameDay', 'nextDay', 'lastDay', 'nextWeek', 'lastWeek', 'sameElse'],
      i,
      property;
    for (i = 0; i < properties.length; i += 1) {
      property = properties[i];
      propertyTest = propertyTest || hasOwnProp(input, property);
    }
    return objectTest && propertyTest;
  }
  function getCalendarFormat(myMoment, now) {
    var diff = myMoment.diff(now, 'days', true);
    return diff < -6 ? 'sameElse' : diff < -1 ? 'lastWeek' : diff < 0 ? 'lastDay' : diff < 1 ? 'sameDay' : diff < 2 ? 'nextDay' : diff < 7 ? 'nextWeek' : 'sameElse';
  }
  function calendar$1(time, formats) {
    // Support for single parameter, formats only overload to the calendar function
    if (arguments.length === 1) {
      if (!arguments[0]) {
        time = undefined;
        formats = undefined;
      } else if (isMomentInput(arguments[0])) {
        time = arguments[0];
        formats = undefined;
      } else if (isCalendarSpec(arguments[0])) {
        formats = arguments[0];
        time = undefined;
      }
    }
    // We want to compare the start of today, vs this.
    // Getting start-of-today depends on whether we're local/utc/offset or not.
    var now = time || createLocal(),
      sod = cloneWithOffset(now, this).startOf('day'),
      format = hooks.calendarFormat(this, sod) || 'sameElse',
      output = formats && (isFunction(formats[format]) ? formats[format].call(this, now) : formats[format]);
    return this.format(output || this.localeData().calendar(format, this, createLocal(now)));
  }
  function clone() {
    return new Moment(this);
  }
  function isAfter(input, units) {
    var localInput = isMoment(input) ? input : createLocal(input);
    if (!(this.isValid() && localInput.isValid())) {
      return false;
    }
    units = normalizeUnits(units) || 'millisecond';
    if (units === 'millisecond') {
      return this.valueOf() > localInput.valueOf();
    } else {
      return localInput.valueOf() < this.clone().startOf(units).valueOf();
    }
  }
  function isBefore(input, units) {
    var localInput = isMoment(input) ? input : createLocal(input);
    if (!(this.isValid() && localInput.isValid())) {
      return false;
    }
    units = normalizeUnits(units) || 'millisecond';
    if (units === 'millisecond') {
      return this.valueOf() < localInput.valueOf();
    } else {
      return this.clone().endOf(units).valueOf() < localInput.valueOf();
    }
  }
  function isBetween(from, to, units, inclusivity) {
    var localFrom = isMoment(from) ? from : createLocal(from),
      localTo = isMoment(to) ? to : createLocal(to);
    if (!(this.isValid() && localFrom.isValid() && localTo.isValid())) {
      return false;
    }
    inclusivity = inclusivity || '()';
    return (inclusivity[0] === '(' ? this.isAfter(localFrom, units) : !this.isBefore(localFrom, units)) && (inclusivity[1] === ')' ? this.isBefore(localTo, units) : !this.isAfter(localTo, units));
  }
  function isSame(input, units) {
    var localInput = isMoment(input) ? input : createLocal(input),
      inputMs;
    if (!(this.isValid() && localInput.isValid())) {
      return false;
    }
    units = normalizeUnits(units) || 'millisecond';
    if (units === 'millisecond') {
      return this.valueOf() === localInput.valueOf();
    } else {
      inputMs = localInput.valueOf();
      return this.clone().startOf(units).valueOf() <= inputMs && inputMs <= this.clone().endOf(units).valueOf();
    }
  }
  function isSameOrAfter(input, units) {
    return this.isSame(input, units) || this.isAfter(input, units);
  }
  function isSameOrBefore(input, units) {
    return this.isSame(input, units) || this.isBefore(input, units);
  }
  function diff(input, units, asFloat) {
    var that, zoneDelta, output;
    if (!this.isValid()) {
      return NaN;
    }
    that = cloneWithOffset(input, this);
    if (!that.isValid()) {
      return NaN;
    }
    zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4;
    units = normalizeUnits(units);
    switch (units) {
      case 'year':
        output = monthDiff(this, that) / 12;
        break;
      case 'month':
        output = monthDiff(this, that);
        break;
      case 'quarter':
        output = monthDiff(this, that) / 3;
        break;
      case 'second':
        output = (this - that) / 1e3;
        break;
      // 1000
      case 'minute':
        output = (this - that) / 6e4;
        break;
      // 1000 * 60
      case 'hour':
        output = (this - that) / 36e5;
        break;
      // 1000 * 60 * 60
      case 'day':
        output = (this - that - zoneDelta) / 864e5;
        break;
      // 1000 * 60 * 60 * 24, negate dst
      case 'week':
        output = (this - that - zoneDelta) / 6048e5;
        break;
      // 1000 * 60 * 60 * 24 * 7, negate dst
      default:
        output = this - that;
    }
    return asFloat ? output : absFloor(output);
  }
  function monthDiff(a, b) {
    if (a.date() < b.date()) {
      // end-of-month calculations work correct when the start month has more
      // days than the end month.
      return -monthDiff(b, a);
    }
    // difference in months
    var wholeMonthDiff = (b.year() - a.year()) * 12 + (b.month() - a.month()),
      // b is in (anchor - 1 month, anchor + 1 month)
      anchor = a.clone().add(wholeMonthDiff, 'months'),
      anchor2,
      adjust;
    if (b - anchor < 0) {
      anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
      // linear across the month
      adjust = (b - anchor) / (anchor - anchor2);
    } else {
      anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
      // linear across the month
      adjust = (b - anchor) / (anchor2 - anchor);
    }

    //check for negative zero, return zero if negative zero
    return -(wholeMonthDiff + adjust) || 0;
  }
  hooks.defaultFormat = 'YYYY-MM-DDTHH:mm:ssZ';
  hooks.defaultFormatUtc = 'YYYY-MM-DDTHH:mm:ss[Z]';
  function toString() {
    return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
  }
  function toISOString(keepOffset) {
    if (!this.isValid()) {
      return null;
    }
    var utc = keepOffset !== true,
      m = utc ? this.clone().utc() : this;
    if (m.year() < 0 || m.year() > 9999) {
      return formatMoment(m, utc ? 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYYYY-MM-DD[T]HH:mm:ss.SSSZ');
    }
    if (isFunction(Date.prototype.toISOString)) {
      // native implementation is ~50x faster, use it when we can
      if (utc) {
        return this.toDate().toISOString();
      } else {
        return new Date(this.valueOf() + this.utcOffset() * 60 * 1000).toISOString().replace('Z', formatMoment(m, 'Z'));
      }
    }
    return formatMoment(m, utc ? 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYY-MM-DD[T]HH:mm:ss.SSSZ');
  }

  /**
   * Return a human readable representation of a moment that can
   * also be evaluated to get a new moment which is the same
   *
   * @link https://nodejs.org/dist/latest/docs/api/util.html#util_custom_inspect_function_on_objects
   */
  function inspect() {
    if (!this.isValid()) {
      return 'moment.invalid(/* ' + this._i + ' */)';
    }
    var func = 'moment',
      zone = '',
      prefix,
      year,
      datetime,
      suffix;
    if (!this.isLocal()) {
      func = this.utcOffset() === 0 ? 'moment.utc' : 'moment.parseZone';
      zone = 'Z';
    }
    prefix = '[' + func + '("]';
    year = 0 <= this.year() && this.year() <= 9999 ? 'YYYY' : 'YYYYYY';
    datetime = '-MM-DD[T]HH:mm:ss.SSS';
    suffix = zone + '[")]';
    return this.format(prefix + year + datetime + suffix);
  }
  function format(inputString) {
    if (!inputString) {
      inputString = this.isUtc() ? hooks.defaultFormatUtc : hooks.defaultFormat;
    }
    var output = formatMoment(this, inputString);
    return this.localeData().postformat(output);
  }
  function from(time, withoutSuffix) {
    if (this.isValid() && (isMoment(time) && time.isValid() || createLocal(time).isValid())) {
      return createDuration({
        to: this,
        from: time
      }).locale(this.locale()).humanize(!withoutSuffix);
    } else {
      return this.localeData().invalidDate();
    }
  }
  function fromNow(withoutSuffix) {
    return this.from(createLocal(), withoutSuffix);
  }
  function to(time, withoutSuffix) {
    if (this.isValid() && (isMoment(time) && time.isValid() || createLocal(time).isValid())) {
      return createDuration({
        from: this,
        to: time
      }).locale(this.locale()).humanize(!withoutSuffix);
    } else {
      return this.localeData().invalidDate();
    }
  }
  function toNow(withoutSuffix) {
    return this.to(createLocal(), withoutSuffix);
  }

  // If passed a locale key, it will set the locale for this
  // instance.  Otherwise, it will return the locale configuration
  // variables for this instance.
  function locale(key) {
    var newLocaleData;
    if (key === undefined) {
      return this._locale._abbr;
    } else {
      newLocaleData = getLocale(key);
      if (newLocaleData != null) {
        this._locale = newLocaleData;
      }
      return this;
    }
  }
  var lang = deprecate('moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.', function (key) {
    if (key === undefined) {
      return this.localeData();
    } else {
      return this.locale(key);
    }
  });
  function localeData() {
    return this._locale;
  }
  var MS_PER_SECOND = 1000,
    MS_PER_MINUTE = 60 * MS_PER_SECOND,
    MS_PER_HOUR = 60 * MS_PER_MINUTE,
    MS_PER_400_YEARS = (365 * 400 + 97) * 24 * MS_PER_HOUR;

  // actual modulo - handles negative numbers (for dates before 1970):
  function mod$1(dividend, divisor) {
    return (dividend % divisor + divisor) % divisor;
  }
  function localStartOfDate(y, m, d) {
    // the date constructor remaps years 0-99 to 1900-1999
    if (y < 100 && y >= 0) {
      // preserve leap years using a full 400 year cycle, then reset
      return new Date(y + 400, m, d) - MS_PER_400_YEARS;
    } else {
      return new Date(y, m, d).valueOf();
    }
  }
  function utcStartOfDate(y, m, d) {
    // Date.UTC remaps years 0-99 to 1900-1999
    if (y < 100 && y >= 0) {
      // preserve leap years using a full 400 year cycle, then reset
      return Date.UTC(y + 400, m, d) - MS_PER_400_YEARS;
    } else {
      return Date.UTC(y, m, d);
    }
  }
  function startOf(units) {
    var time, startOfDate;
    units = normalizeUnits(units);
    if (units === undefined || units === 'millisecond' || !this.isValid()) {
      return this;
    }
    startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;
    switch (units) {
      case 'year':
        time = startOfDate(this.year(), 0, 1);
        break;
      case 'quarter':
        time = startOfDate(this.year(), this.month() - this.month() % 3, 1);
        break;
      case 'month':
        time = startOfDate(this.year(), this.month(), 1);
        break;
      case 'week':
        time = startOfDate(this.year(), this.month(), this.date() - this.weekday());
        break;
      case 'isoWeek':
        time = startOfDate(this.year(), this.month(), this.date() - (this.isoWeekday() - 1));
        break;
      case 'day':
      case 'date':
        time = startOfDate(this.year(), this.month(), this.date());
        break;
      case 'hour':
        time = this._d.valueOf();
        time -= mod$1(time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE), MS_PER_HOUR);
        break;
      case 'minute':
        time = this._d.valueOf();
        time -= mod$1(time, MS_PER_MINUTE);
        break;
      case 'second':
        time = this._d.valueOf();
        time -= mod$1(time, MS_PER_SECOND);
        break;
    }
    this._d.setTime(time);
    hooks.updateOffset(this, true);
    return this;
  }
  function endOf(units) {
    var time, startOfDate;
    units = normalizeUnits(units);
    if (units === undefined || units === 'millisecond' || !this.isValid()) {
      return this;
    }
    startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;
    switch (units) {
      case 'year':
        time = startOfDate(this.year() + 1, 0, 1) - 1;
        break;
      case 'quarter':
        time = startOfDate(this.year(), this.month() - this.month() % 3 + 3, 1) - 1;
        break;
      case 'month':
        time = startOfDate(this.year(), this.month() + 1, 1) - 1;
        break;
      case 'week':
        time = startOfDate(this.year(), this.month(), this.date() - this.weekday() + 7) - 1;
        break;
      case 'isoWeek':
        time = startOfDate(this.year(), this.month(), this.date() - (this.isoWeekday() - 1) + 7) - 1;
        break;
      case 'day':
      case 'date':
        time = startOfDate(this.year(), this.month(), this.date() + 1) - 1;
        break;
      case 'hour':
        time = this._d.valueOf();
        time += MS_PER_HOUR - mod$1(time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE), MS_PER_HOUR) - 1;
        break;
      case 'minute':
        time = this._d.valueOf();
        time += MS_PER_MINUTE - mod$1(time, MS_PER_MINUTE) - 1;
        break;
      case 'second':
        time = this._d.valueOf();
        time += MS_PER_SECOND - mod$1(time, MS_PER_SECOND) - 1;
        break;
    }
    this._d.setTime(time);
    hooks.updateOffset(this, true);
    return this;
  }
  function valueOf() {
    return this._d.valueOf() - (this._offset || 0) * 60000;
  }
  function unix() {
    return Math.floor(this.valueOf() / 1000);
  }
  function toDate() {
    return new Date(this.valueOf());
  }
  function toArray() {
    var m = this;
    return [m.year(), m.month(), m.date(), m.hour(), m.minute(), m.second(), m.millisecond()];
  }
  function toObject() {
    var m = this;
    return {
      years: m.year(),
      months: m.month(),
      date: m.date(),
      hours: m.hours(),
      minutes: m.minutes(),
      seconds: m.seconds(),
      milliseconds: m.milliseconds()
    };
  }
  function toJSON() {
    // new Date(NaN).toJSON() === null
    return this.isValid() ? this.toISOString() : null;
  }
  function isValid$2() {
    return isValid(this);
  }
  function parsingFlags() {
    return extend({}, getParsingFlags(this));
  }
  function invalidAt() {
    return getParsingFlags(this).overflow;
  }
  function creationData() {
    return {
      input: this._i,
      format: this._f,
      locale: this._locale,
      isUTC: this._isUTC,
      strict: this._strict
    };
  }
  addFormatToken('N', 0, 0, 'eraAbbr');
  addFormatToken('NN', 0, 0, 'eraAbbr');
  addFormatToken('NNN', 0, 0, 'eraAbbr');
  addFormatToken('NNNN', 0, 0, 'eraName');
  addFormatToken('NNNNN', 0, 0, 'eraNarrow');
  addFormatToken('y', ['y', 1], 'yo', 'eraYear');
  addFormatToken('y', ['yy', 2], 0, 'eraYear');
  addFormatToken('y', ['yyy', 3], 0, 'eraYear');
  addFormatToken('y', ['yyyy', 4], 0, 'eraYear');
  addRegexToken('N', matchEraAbbr);
  addRegexToken('NN', matchEraAbbr);
  addRegexToken('NNN', matchEraAbbr);
  addRegexToken('NNNN', matchEraName);
  addRegexToken('NNNNN', matchEraNarrow);
  addParseToken(['N', 'NN', 'NNN', 'NNNN', 'NNNNN'], function (input, array, config, token) {
    var era = config._locale.erasParse(input, token, config._strict);
    if (era) {
      getParsingFlags(config).era = era;
    } else {
      getParsingFlags(config).invalidEra = input;
    }
  });
  addRegexToken('y', matchUnsigned);
  addRegexToken('yy', matchUnsigned);
  addRegexToken('yyy', matchUnsigned);
  addRegexToken('yyyy', matchUnsigned);
  addRegexToken('yo', matchEraYearOrdinal);
  addParseToken(['y', 'yy', 'yyy', 'yyyy'], YEAR);
  addParseToken(['yo'], function (input, array, config, token) {
    var match;
    if (config._locale._eraYearOrdinalRegex) {
      match = input.match(config._locale._eraYearOrdinalRegex);
    }
    if (config._locale.eraYearOrdinalParse) {
      array[YEAR] = config._locale.eraYearOrdinalParse(input, match);
    } else {
      array[YEAR] = parseInt(input, 10);
    }
  });
  function localeEras(m, format) {
    var i,
      l,
      date,
      eras = this._eras || getLocale('en')._eras;
    for (i = 0, l = eras.length; i < l; ++i) {
      switch (typeof eras[i].since) {
        case 'string':
          // truncate time
          date = hooks(eras[i].since).startOf('day');
          eras[i].since = date.valueOf();
          break;
      }
      switch (typeof eras[i].until) {
        case 'undefined':
          eras[i].until = +Infinity;
          break;
        case 'string':
          // truncate time
          date = hooks(eras[i].until).startOf('day').valueOf();
          eras[i].until = date.valueOf();
          break;
      }
    }
    return eras;
  }
  function localeErasParse(eraName, format, strict) {
    var i,
      l,
      eras = this.eras(),
      name,
      abbr,
      narrow;
    eraName = eraName.toUpperCase();
    for (i = 0, l = eras.length; i < l; ++i) {
      name = eras[i].name.toUpperCase();
      abbr = eras[i].abbr.toUpperCase();
      narrow = eras[i].narrow.toUpperCase();
      if (strict) {
        switch (format) {
          case 'N':
          case 'NN':
          case 'NNN':
            if (abbr === eraName) {
              return eras[i];
            }
            break;
          case 'NNNN':
            if (name === eraName) {
              return eras[i];
            }
            break;
          case 'NNNNN':
            if (narrow === eraName) {
              return eras[i];
            }
            break;
        }
      } else if ([name, abbr, narrow].indexOf(eraName) >= 0) {
        return eras[i];
      }
    }
  }
  function localeErasConvertYear(era, year) {
    var dir = era.since <= era.until ? +1 : -1;
    if (year === undefined) {
      return hooks(era.since).year();
    } else {
      return hooks(era.since).year() + (year - era.offset) * dir;
    }
  }
  function getEraName() {
    var i,
      l,
      val,
      eras = this.localeData().eras();
    for (i = 0, l = eras.length; i < l; ++i) {
      // truncate time
      val = this.clone().startOf('day').valueOf();
      if (eras[i].since <= val && val <= eras[i].until) {
        return eras[i].name;
      }
      if (eras[i].until <= val && val <= eras[i].since) {
        return eras[i].name;
      }
    }
    return '';
  }
  function getEraNarrow() {
    var i,
      l,
      val,
      eras = this.localeData().eras();
    for (i = 0, l = eras.length; i < l; ++i) {
      // truncate time
      val = this.clone().startOf('day').valueOf();
      if (eras[i].since <= val && val <= eras[i].until) {
        return eras[i].narrow;
      }
      if (eras[i].until <= val && val <= eras[i].since) {
        return eras[i].narrow;
      }
    }
    return '';
  }
  function getEraAbbr() {
    var i,
      l,
      val,
      eras = this.localeData().eras();
    for (i = 0, l = eras.length; i < l; ++i) {
      // truncate time
      val = this.clone().startOf('day').valueOf();
      if (eras[i].since <= val && val <= eras[i].until) {
        return eras[i].abbr;
      }
      if (eras[i].until <= val && val <= eras[i].since) {
        return eras[i].abbr;
      }
    }
    return '';
  }
  function getEraYear() {
    var i,
      l,
      dir,
      val,
      eras = this.localeData().eras();
    for (i = 0, l = eras.length; i < l; ++i) {
      dir = eras[i].since <= eras[i].until ? +1 : -1;

      // truncate time
      val = this.clone().startOf('day').valueOf();
      if (eras[i].since <= val && val <= eras[i].until || eras[i].until <= val && val <= eras[i].since) {
        return (this.year() - hooks(eras[i].since).year()) * dir + eras[i].offset;
      }
    }
    return this.year();
  }
  function erasNameRegex(isStrict) {
    if (!hasOwnProp(this, '_erasNameRegex')) {
      computeErasParse.call(this);
    }
    return isStrict ? this._erasNameRegex : this._erasRegex;
  }
  function erasAbbrRegex(isStrict) {
    if (!hasOwnProp(this, '_erasAbbrRegex')) {
      computeErasParse.call(this);
    }
    return isStrict ? this._erasAbbrRegex : this._erasRegex;
  }
  function erasNarrowRegex(isStrict) {
    if (!hasOwnProp(this, '_erasNarrowRegex')) {
      computeErasParse.call(this);
    }
    return isStrict ? this._erasNarrowRegex : this._erasRegex;
  }
  function matchEraAbbr(isStrict, locale) {
    return locale.erasAbbrRegex(isStrict);
  }
  function matchEraName(isStrict, locale) {
    return locale.erasNameRegex(isStrict);
  }
  function matchEraNarrow(isStrict, locale) {
    return locale.erasNarrowRegex(isStrict);
  }
  function matchEraYearOrdinal(isStrict, locale) {
    return locale._eraYearOrdinalRegex || matchUnsigned;
  }
  function computeErasParse() {
    var abbrPieces = [],
      namePieces = [],
      narrowPieces = [],
      mixedPieces = [],
      i,
      l,
      erasName,
      erasAbbr,
      erasNarrow,
      eras = this.eras();
    for (i = 0, l = eras.length; i < l; ++i) {
      erasName = regexEscape(eras[i].name);
      erasAbbr = regexEscape(eras[i].abbr);
      erasNarrow = regexEscape(eras[i].narrow);
      namePieces.push(erasName);
      abbrPieces.push(erasAbbr);
      narrowPieces.push(erasNarrow);
      mixedPieces.push(erasName);
      mixedPieces.push(erasAbbr);
      mixedPieces.push(erasNarrow);
    }
    this._erasRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
    this._erasNameRegex = new RegExp('^(' + namePieces.join('|') + ')', 'i');
    this._erasAbbrRegex = new RegExp('^(' + abbrPieces.join('|') + ')', 'i');
    this._erasNarrowRegex = new RegExp('^(' + narrowPieces.join('|') + ')', 'i');
  }

  // FORMATTING

  addFormatToken(0, ['gg', 2], 0, function () {
    return this.weekYear() % 100;
  });
  addFormatToken(0, ['GG', 2], 0, function () {
    return this.isoWeekYear() % 100;
  });
  function addWeekYearFormatToken(token, getter) {
    addFormatToken(0, [token, token.length], 0, getter);
  }
  addWeekYearFormatToken('gggg', 'weekYear');
  addWeekYearFormatToken('ggggg', 'weekYear');
  addWeekYearFormatToken('GGGG', 'isoWeekYear');
  addWeekYearFormatToken('GGGGG', 'isoWeekYear');

  // ALIASES

  // PARSING

  addRegexToken('G', matchSigned);
  addRegexToken('g', matchSigned);
  addRegexToken('GG', match1to2, match2);
  addRegexToken('gg', match1to2, match2);
  addRegexToken('GGGG', match1to4, match4);
  addRegexToken('gggg', match1to4, match4);
  addRegexToken('GGGGG', match1to6, match6);
  addRegexToken('ggggg', match1to6, match6);
  addWeekParseToken(['gggg', 'ggggg', 'GGGG', 'GGGGG'], function (input, week, config, token) {
    week[token.substr(0, 2)] = toInt(input);
  });
  addWeekParseToken(['gg', 'GG'], function (input, week, config, token) {
    week[token] = hooks.parseTwoDigitYear(input);
  });

  // MOMENTS

  function getSetWeekYear(input) {
    return getSetWeekYearHelper.call(this, input, this.week(), this.weekday() + this.localeData()._week.dow, this.localeData()._week.dow, this.localeData()._week.doy);
  }
  function getSetISOWeekYear(input) {
    return getSetWeekYearHelper.call(this, input, this.isoWeek(), this.isoWeekday(), 1, 4);
  }
  function getISOWeeksInYear() {
    return weeksInYear(this.year(), 1, 4);
  }
  function getISOWeeksInISOWeekYear() {
    return weeksInYear(this.isoWeekYear(), 1, 4);
  }
  function getWeeksInYear() {
    var weekInfo = this.localeData()._week;
    return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
  }
  function getWeeksInWeekYear() {
    var weekInfo = this.localeData()._week;
    return weeksInYear(this.weekYear(), weekInfo.dow, weekInfo.doy);
  }
  function getSetWeekYearHelper(input, week, weekday, dow, doy) {
    var weeksTarget;
    if (input == null) {
      return weekOfYear(this, dow, doy).year;
    } else {
      weeksTarget = weeksInYear(input, dow, doy);
      if (week > weeksTarget) {
        week = weeksTarget;
      }
      return setWeekAll.call(this, input, week, weekday, dow, doy);
    }
  }
  function setWeekAll(weekYear, week, weekday, dow, doy) {
    var dayOfYearData = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy),
      date = createUTCDate(dayOfYearData.year, 0, dayOfYearData.dayOfYear);
    this.year(date.getUTCFullYear());
    this.month(date.getUTCMonth());
    this.date(date.getUTCDate());
    return this;
  }

  // FORMATTING

  addFormatToken('Q', 0, 'Qo', 'quarter');

  // PARSING

  addRegexToken('Q', match1);
  addParseToken('Q', function (input, array) {
    array[MONTH] = (toInt(input) - 1) * 3;
  });

  // MOMENTS

  function getSetQuarter(input) {
    return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
  }

  // FORMATTING

  addFormatToken('D', ['DD', 2], 'Do', 'date');

  // PARSING

  addRegexToken('D', match1to2, match1to2NoLeadingZero);
  addRegexToken('DD', match1to2, match2);
  addRegexToken('Do', function (isStrict, locale) {
    // TODO: Remove "ordinalParse" fallback in next major release.
    return isStrict ? locale._dayOfMonthOrdinalParse || locale._ordinalParse : locale._dayOfMonthOrdinalParseLenient;
  });
  addParseToken(['D', 'DD'], DATE);
  addParseToken('Do', function (input, array) {
    array[DATE] = toInt(input.match(match1to2)[0]);
  });

  // MOMENTS

  var getSetDayOfMonth = makeGetSet('Date', true);

  // FORMATTING

  addFormatToken('DDD', ['DDDD', 3], 'DDDo', 'dayOfYear');

  // PARSING

  addRegexToken('DDD', match1to3);
  addRegexToken('DDDD', match3);
  addParseToken(['DDD', 'DDDD'], function (input, array, config) {
    config._dayOfYear = toInt(input);
  });

  // HELPERS

  // MOMENTS

  function getSetDayOfYear(input) {
    var dayOfYear = Math.round((this.clone().startOf('day') - this.clone().startOf('year')) / 864e5) + 1;
    return input == null ? dayOfYear : this.add(input - dayOfYear, 'd');
  }

  // FORMATTING

  addFormatToken('m', ['mm', 2], 0, 'minute');

  // PARSING

  addRegexToken('m', match1to2, match1to2HasZero);
  addRegexToken('mm', match1to2, match2);
  addParseToken(['m', 'mm'], MINUTE);

  // MOMENTS

  var getSetMinute = makeGetSet('Minutes', false);

  // FORMATTING

  addFormatToken('s', ['ss', 2], 0, 'second');

  // PARSING

  addRegexToken('s', match1to2, match1to2HasZero);
  addRegexToken('ss', match1to2, match2);
  addParseToken(['s', 'ss'], SECOND);

  // MOMENTS

  var getSetSecond = makeGetSet('Seconds', false);

  // FORMATTING

  addFormatToken('S', 0, 0, function () {
    return ~~(this.millisecond() / 100);
  });
  addFormatToken(0, ['SS', 2], 0, function () {
    return ~~(this.millisecond() / 10);
  });
  addFormatToken(0, ['SSS', 3], 0, 'millisecond');
  addFormatToken(0, ['SSSS', 4], 0, function () {
    return this.millisecond() * 10;
  });
  addFormatToken(0, ['SSSSS', 5], 0, function () {
    return this.millisecond() * 100;
  });
  addFormatToken(0, ['SSSSSS', 6], 0, function () {
    return this.millisecond() * 1000;
  });
  addFormatToken(0, ['SSSSSSS', 7], 0, function () {
    return this.millisecond() * 10000;
  });
  addFormatToken(0, ['SSSSSSSS', 8], 0, function () {
    return this.millisecond() * 100000;
  });
  addFormatToken(0, ['SSSSSSSSS', 9], 0, function () {
    return this.millisecond() * 1000000;
  });

  // PARSING

  addRegexToken('S', match1to3, match1);
  addRegexToken('SS', match1to3, match2);
  addRegexToken('SSS', match1to3, match3);
  var token, getSetMillisecond;
  for (token = 'SSSS'; token.length <= 9; token += 'S') {
    addRegexToken(token, matchUnsigned);
  }
  function parseMs(input, array) {
    array[MILLISECOND] = toInt(('0.' + input) * 1000);
  }
  for (token = 'S'; token.length <= 9; token += 'S') {
    addParseToken(token, parseMs);
  }
  getSetMillisecond = makeGetSet('Milliseconds', false);

  // FORMATTING

  addFormatToken('z', 0, 0, 'zoneAbbr');
  addFormatToken('zz', 0, 0, 'zoneName');

  // MOMENTS

  function getZoneAbbr() {
    return this._isUTC ? 'UTC' : '';
  }
  function getZoneName() {
    return this._isUTC ? 'Coordinated Universal Time' : '';
  }
  var proto = Moment.prototype;
  proto.add = add;
  proto.calendar = calendar$1;
  proto.clone = clone;
  proto.diff = diff;
  proto.endOf = endOf;
  proto.format = format;
  proto.from = from;
  proto.fromNow = fromNow;
  proto.to = to;
  proto.toNow = toNow;
  proto.get = stringGet;
  proto.invalidAt = invalidAt;
  proto.isAfter = isAfter;
  proto.isBefore = isBefore;
  proto.isBetween = isBetween;
  proto.isSame = isSame;
  proto.isSameOrAfter = isSameOrAfter;
  proto.isSameOrBefore = isSameOrBefore;
  proto.isValid = isValid$2;
  proto.lang = lang;
  proto.locale = locale;
  proto.localeData = localeData;
  proto.max = prototypeMax;
  proto.min = prototypeMin;
  proto.parsingFlags = parsingFlags;
  proto.set = stringSet;
  proto.startOf = startOf;
  proto.subtract = subtract;
  proto.toArray = toArray;
  proto.toObject = toObject;
  proto.toDate = toDate;
  proto.toISOString = toISOString;
  proto.inspect = inspect;
  if (typeof Symbol !== 'undefined' && Symbol.for != null) {
    proto[Symbol.for('nodejs.util.inspect.custom')] = function () {
      return 'Moment<' + this.format() + '>';
    };
  }
  proto.toJSON = toJSON;
  proto.toString = toString;
  proto.unix = unix;
  proto.valueOf = valueOf;
  proto.creationData = creationData;
  proto.eraName = getEraName;
  proto.eraNarrow = getEraNarrow;
  proto.eraAbbr = getEraAbbr;
  proto.eraYear = getEraYear;
  proto.year = getSetYear;
  proto.isLeapYear = getIsLeapYear;
  proto.weekYear = getSetWeekYear;
  proto.isoWeekYear = getSetISOWeekYear;
  proto.quarter = proto.quarters = getSetQuarter;
  proto.month = getSetMonth;
  proto.daysInMonth = getDaysInMonth;
  proto.week = proto.weeks = getSetWeek;
  proto.isoWeek = proto.isoWeeks = getSetISOWeek;
  proto.weeksInYear = getWeeksInYear;
  proto.weeksInWeekYear = getWeeksInWeekYear;
  proto.isoWeeksInYear = getISOWeeksInYear;
  proto.isoWeeksInISOWeekYear = getISOWeeksInISOWeekYear;
  proto.date = getSetDayOfMonth;
  proto.day = proto.days = getSetDayOfWeek;
  proto.weekday = getSetLocaleDayOfWeek;
  proto.isoWeekday = getSetISODayOfWeek;
  proto.dayOfYear = getSetDayOfYear;
  proto.hour = proto.hours = getSetHour;
  proto.minute = proto.minutes = getSetMinute;
  proto.second = proto.seconds = getSetSecond;
  proto.millisecond = proto.milliseconds = getSetMillisecond;
  proto.utcOffset = getSetOffset;
  proto.utc = setOffsetToUTC;
  proto.local = setOffsetToLocal;
  proto.parseZone = setOffsetToParsedOffset;
  proto.hasAlignedHourOffset = hasAlignedHourOffset;
  proto.isDST = isDaylightSavingTime;
  proto.isLocal = isLocal;
  proto.isUtcOffset = isUtcOffset;
  proto.isUtc = isUtc;
  proto.isUTC = isUtc;
  proto.zoneAbbr = getZoneAbbr;
  proto.zoneName = getZoneName;
  proto.dates = deprecate('dates accessor is deprecated. Use date instead.', getSetDayOfMonth);
  proto.months = deprecate('months accessor is deprecated. Use month instead', getSetMonth);
  proto.years = deprecate('years accessor is deprecated. Use year instead', getSetYear);
  proto.zone = deprecate('moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/', getSetZone);
  proto.isDSTShifted = deprecate('isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information', isDaylightSavingTimeShifted);
  function createUnix(input) {
    return createLocal(input * 1000);
  }
  function createInZone() {
    return createLocal.apply(null, arguments).parseZone();
  }
  function preParsePostFormat(string) {
    return string;
  }
  var proto$1 = Locale.prototype;
  proto$1.calendar = calendar;
  proto$1.longDateFormat = longDateFormat;
  proto$1.invalidDate = invalidDate;
  proto$1.ordinal = ordinal;
  proto$1.preparse = preParsePostFormat;
  proto$1.postformat = preParsePostFormat;
  proto$1.relativeTime = relativeTime;
  proto$1.pastFuture = pastFuture;
  proto$1.set = set;
  proto$1.eras = localeEras;
  proto$1.erasParse = localeErasParse;
  proto$1.erasConvertYear = localeErasConvertYear;
  proto$1.erasAbbrRegex = erasAbbrRegex;
  proto$1.erasNameRegex = erasNameRegex;
  proto$1.erasNarrowRegex = erasNarrowRegex;
  proto$1.months = localeMonths;
  proto$1.monthsShort = localeMonthsShort;
  proto$1.monthsParse = localeMonthsParse;
  proto$1.monthsRegex = monthsRegex;
  proto$1.monthsShortRegex = monthsShortRegex;
  proto$1.week = localeWeek;
  proto$1.firstDayOfYear = localeFirstDayOfYear;
  proto$1.firstDayOfWeek = localeFirstDayOfWeek;
  proto$1.weekdays = localeWeekdays;
  proto$1.weekdaysMin = localeWeekdaysMin;
  proto$1.weekdaysShort = localeWeekdaysShort;
  proto$1.weekdaysParse = localeWeekdaysParse;
  proto$1.weekdaysRegex = weekdaysRegex;
  proto$1.weekdaysShortRegex = weekdaysShortRegex;
  proto$1.weekdaysMinRegex = weekdaysMinRegex;
  proto$1.isPM = localeIsPM;
  proto$1.meridiem = localeMeridiem;
  function get$1(format, index, field, setter) {
    var locale = getLocale(),
      utc = createUTC().set(setter, index);
    return locale[field](utc, format);
  }
  function listMonthsImpl(format, index, field) {
    if (isNumber(format)) {
      index = format;
      format = undefined;
    }
    format = format || '';
    if (index != null) {
      return get$1(format, index, field, 'month');
    }
    var i,
      out = [];
    for (i = 0; i < 12; i++) {
      out[i] = get$1(format, i, field, 'month');
    }
    return out;
  }

  // ()
  // (5)
  // (fmt, 5)
  // (fmt)
  // (true)
  // (true, 5)
  // (true, fmt, 5)
  // (true, fmt)
  function listWeekdaysImpl(localeSorted, format, index, field) {
    if (typeof localeSorted === 'boolean') {
      if (isNumber(format)) {
        index = format;
        format = undefined;
      }
      format = format || '';
    } else {
      format = localeSorted;
      index = format;
      localeSorted = false;
      if (isNumber(format)) {
        index = format;
        format = undefined;
      }
      format = format || '';
    }
    var locale = getLocale(),
      shift = localeSorted ? locale._week.dow : 0,
      i,
      out = [];
    if (index != null) {
      return get$1(format, (index + shift) % 7, field, 'day');
    }
    for (i = 0; i < 7; i++) {
      out[i] = get$1(format, (i + shift) % 7, field, 'day');
    }
    return out;
  }
  function listMonths(format, index) {
    return listMonthsImpl(format, index, 'months');
  }
  function listMonthsShort(format, index) {
    return listMonthsImpl(format, index, 'monthsShort');
  }
  function listWeekdays(localeSorted, format, index) {
    return listWeekdaysImpl(localeSorted, format, index, 'weekdays');
  }
  function listWeekdaysShort(localeSorted, format, index) {
    return listWeekdaysImpl(localeSorted, format, index, 'weekdaysShort');
  }
  function listWeekdaysMin(localeSorted, format, index) {
    return listWeekdaysImpl(localeSorted, format, index, 'weekdaysMin');
  }
  getSetGlobalLocale('en', {
    eras: [{
      since: '0001-01-01',
      until: +Infinity,
      offset: 1,
      name: 'Anno Domini',
      narrow: 'AD',
      abbr: 'AD'
    }, {
      since: '0000-12-31',
      until: -Infinity,
      offset: 1,
      name: 'Before Christ',
      narrow: 'BC',
      abbr: 'BC'
    }],
    dayOfMonthOrdinalParse: /\d{1,2}(th|st|nd|rd)/,
    ordinal: function (number) {
      var b = number % 10,
        output = toInt(number % 100 / 10) === 1 ? 'th' : b === 1 ? 'st' : b === 2 ? 'nd' : b === 3 ? 'rd' : 'th';
      return number + output;
    }
  });

  // Side effect imports

  hooks.lang = deprecate('moment.lang is deprecated. Use moment.locale instead.', getSetGlobalLocale);
  hooks.langData = deprecate('moment.langData is deprecated. Use moment.localeData instead.', getLocale);
  var mathAbs = Math.abs;
  function abs() {
    var data = this._data;
    this._milliseconds = mathAbs(this._milliseconds);
    this._days = mathAbs(this._days);
    this._months = mathAbs(this._months);
    data.milliseconds = mathAbs(data.milliseconds);
    data.seconds = mathAbs(data.seconds);
    data.minutes = mathAbs(data.minutes);
    data.hours = mathAbs(data.hours);
    data.months = mathAbs(data.months);
    data.years = mathAbs(data.years);
    return this;
  }
  function addSubtract$1(duration, input, value, direction) {
    var other = createDuration(input, value);
    duration._milliseconds += direction * other._milliseconds;
    duration._days += direction * other._days;
    duration._months += direction * other._months;
    return duration._bubble();
  }

  // supports only 2.0-style add(1, 's') or add(duration)
  function add$1(input, value) {
    return addSubtract$1(this, input, value, 1);
  }

  // supports only 2.0-style subtract(1, 's') or subtract(duration)
  function subtract$1(input, value) {
    return addSubtract$1(this, input, value, -1);
  }
  function absCeil(number) {
    if (number < 0) {
      return Math.floor(number);
    } else {
      return Math.ceil(number);
    }
  }
  function bubble() {
    var milliseconds = this._milliseconds,
      days = this._days,
      months = this._months,
      data = this._data,
      seconds,
      minutes,
      hours,
      years,
      monthsFromDays;

    // if we have a mix of positive and negative values, bubble down first
    // check: https://github.com/moment/moment/issues/2166
    if (!(milliseconds >= 0 && days >= 0 && months >= 0 || milliseconds <= 0 && days <= 0 && months <= 0)) {
      milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
      days = 0;
      months = 0;
    }

    // The following code bubbles up values, see the tests for
    // examples of what that means.
    data.milliseconds = milliseconds % 1000;
    seconds = absFloor(milliseconds / 1000);
    data.seconds = seconds % 60;
    minutes = absFloor(seconds / 60);
    data.minutes = minutes % 60;
    hours = absFloor(minutes / 60);
    data.hours = hours % 24;
    days += absFloor(hours / 24);

    // convert days to months
    monthsFromDays = absFloor(daysToMonths(days));
    months += monthsFromDays;
    days -= absCeil(monthsToDays(monthsFromDays));

    // 12 months -> 1 year
    years = absFloor(months / 12);
    months %= 12;
    data.days = days;
    data.months = months;
    data.years = years;
    return this;
  }
  function daysToMonths(days) {
    // 400 years have 146097 days (taking into account leap year rules)
    // 400 years have 12 months === 4800
    return days * 4800 / 146097;
  }
  function monthsToDays(months) {
    // the reverse of daysToMonths
    return months * 146097 / 4800;
  }
  function as(units) {
    if (!this.isValid()) {
      return NaN;
    }
    var days,
      months,
      milliseconds = this._milliseconds;
    units = normalizeUnits(units);
    if (units === 'month' || units === 'quarter' || units === 'year') {
      days = this._days + milliseconds / 864e5;
      months = this._months + daysToMonths(days);
      switch (units) {
        case 'month':
          return months;
        case 'quarter':
          return months / 3;
        case 'year':
          return months / 12;
      }
    } else {
      // handle milliseconds separately because of floating point math errors (issue #1867)
      days = this._days + Math.round(monthsToDays(this._months));
      switch (units) {
        case 'week':
          return days / 7 + milliseconds / 6048e5;
        case 'day':
          return days + milliseconds / 864e5;
        case 'hour':
          return days * 24 + milliseconds / 36e5;
        case 'minute':
          return days * 1440 + milliseconds / 6e4;
        case 'second':
          return days * 86400 + milliseconds / 1000;
        // Math.floor prevents floating point math errors here
        case 'millisecond':
          return Math.floor(days * 864e5) + milliseconds;
        default:
          throw new Error('Unknown unit ' + units);
      }
    }
  }
  function makeAs(alias) {
    return function () {
      return this.as(alias);
    };
  }
  var asMilliseconds = makeAs('ms'),
    asSeconds = makeAs('s'),
    asMinutes = makeAs('m'),
    asHours = makeAs('h'),
    asDays = makeAs('d'),
    asWeeks = makeAs('w'),
    asMonths = makeAs('M'),
    asQuarters = makeAs('Q'),
    asYears = makeAs('y'),
    valueOf$1 = asMilliseconds;
  function clone$1() {
    return createDuration(this);
  }
  function get$2(units) {
    units = normalizeUnits(units);
    return this.isValid() ? this[units + 's']() : NaN;
  }
  function makeGetter(name) {
    return function () {
      return this.isValid() ? this._data[name] : NaN;
    };
  }
  var milliseconds = makeGetter('milliseconds'),
    seconds = makeGetter('seconds'),
    minutes = makeGetter('minutes'),
    hours = makeGetter('hours'),
    days = makeGetter('days'),
    months = makeGetter('months'),
    years = makeGetter('years');
  function weeks() {
    return absFloor(this.days() / 7);
  }
  var round = Math.round,
    thresholds = {
      ss: 44,
      // a few seconds to seconds
      s: 45,
      // seconds to minute
      m: 45,
      // minutes to hour
      h: 22,
      // hours to day
      d: 26,
      // days to month/week
      w: null,
      // weeks to month
      M: 11 // months to year
    };

  // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
  function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
    return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
  }
  function relativeTime$1(posNegDuration, withoutSuffix, thresholds, locale) {
    var duration = createDuration(posNegDuration).abs(),
      seconds = round(duration.as('s')),
      minutes = round(duration.as('m')),
      hours = round(duration.as('h')),
      days = round(duration.as('d')),
      months = round(duration.as('M')),
      weeks = round(duration.as('w')),
      years = round(duration.as('y')),
      a = seconds <= thresholds.ss && ['s', seconds] || seconds < thresholds.s && ['ss', seconds] || minutes <= 1 && ['m'] || minutes < thresholds.m && ['mm', minutes] || hours <= 1 && ['h'] || hours < thresholds.h && ['hh', hours] || days <= 1 && ['d'] || days < thresholds.d && ['dd', days];
    if (thresholds.w != null) {
      a = a || weeks <= 1 && ['w'] || weeks < thresholds.w && ['ww', weeks];
    }
    a = a || months <= 1 && ['M'] || months < thresholds.M && ['MM', months] || years <= 1 && ['y'] || ['yy', years];
    a[2] = withoutSuffix;
    a[3] = +posNegDuration > 0;
    a[4] = locale;
    return substituteTimeAgo.apply(null, a);
  }

  // This function allows you to set the rounding function for relative time strings
  function getSetRelativeTimeRounding(roundingFunction) {
    if (roundingFunction === undefined) {
      return round;
    }
    if (typeof roundingFunction === 'function') {
      round = roundingFunction;
      return true;
    }
    return false;
  }

  // This function allows you to set a threshold for relative time strings
  function getSetRelativeTimeThreshold(threshold, limit) {
    if (thresholds[threshold] === undefined) {
      return false;
    }
    if (limit === undefined) {
      return thresholds[threshold];
    }
    thresholds[threshold] = limit;
    if (threshold === 's') {
      thresholds.ss = limit - 1;
    }
    return true;
  }
  function humanize(argWithSuffix, argThresholds) {
    if (!this.isValid()) {
      return this.localeData().invalidDate();
    }
    var withSuffix = false,
      th = thresholds,
      locale,
      output;
    if (typeof argWithSuffix === 'object') {
      argThresholds = argWithSuffix;
      argWithSuffix = false;
    }
    if (typeof argWithSuffix === 'boolean') {
      withSuffix = argWithSuffix;
    }
    if (typeof argThresholds === 'object') {
      th = Object.assign({}, thresholds, argThresholds);
      if (argThresholds.s != null && argThresholds.ss == null) {
        th.ss = argThresholds.s - 1;
      }
    }
    locale = this.localeData();
    output = relativeTime$1(this, !withSuffix, th, locale);
    if (withSuffix) {
      output = locale.pastFuture(+this, output);
    }
    return locale.postformat(output);
  }
  var abs$1 = Math.abs;
  function sign(x) {
    return (x > 0) - (x < 0) || +x;
  }
  function toISOString$1() {
    // for ISO strings we do not use the normal bubbling rules:
    //  * milliseconds bubble up until they become hours
    //  * days do not bubble at all
    //  * months bubble up until they become years
    // This is because there is no context-free conversion between hours and days
    // (think of clock changes)
    // and also not between days and months (28-31 days per month)
    if (!this.isValid()) {
      return this.localeData().invalidDate();
    }
    var seconds = abs$1(this._milliseconds) / 1000,
      days = abs$1(this._days),
      months = abs$1(this._months),
      minutes,
      hours,
      years,
      s,
      total = this.asSeconds(),
      totalSign,
      ymSign,
      daysSign,
      hmsSign;
    if (!total) {
      // this is the same as C#'s (Noda) and python (isodate)...
      // but not other JS (goog.date)
      return 'P0D';
    }

    // 3600 seconds -> 60 minutes -> 1 hour
    minutes = absFloor(seconds / 60);
    hours = absFloor(minutes / 60);
    seconds %= 60;
    minutes %= 60;

    // 12 months -> 1 year
    years = absFloor(months / 12);
    months %= 12;

    // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
    s = seconds ? seconds.toFixed(3).replace(/\.?0+$/, '') : '';
    totalSign = total < 0 ? '-' : '';
    ymSign = sign(this._months) !== sign(total) ? '-' : '';
    daysSign = sign(this._days) !== sign(total) ? '-' : '';
    hmsSign = sign(this._milliseconds) !== sign(total) ? '-' : '';
    return totalSign + 'P' + (years ? ymSign + years + 'Y' : '') + (months ? ymSign + months + 'M' : '') + (days ? daysSign + days + 'D' : '') + (hours || minutes || seconds ? 'T' : '') + (hours ? hmsSign + hours + 'H' : '') + (minutes ? hmsSign + minutes + 'M' : '') + (seconds ? hmsSign + s + 'S' : '');
  }
  var proto$2 = Duration.prototype;
  proto$2.isValid = isValid$1;
  proto$2.abs = abs;
  proto$2.add = add$1;
  proto$2.subtract = subtract$1;
  proto$2.as = as;
  proto$2.asMilliseconds = asMilliseconds;
  proto$2.asSeconds = asSeconds;
  proto$2.asMinutes = asMinutes;
  proto$2.asHours = asHours;
  proto$2.asDays = asDays;
  proto$2.asWeeks = asWeeks;
  proto$2.asMonths = asMonths;
  proto$2.asQuarters = asQuarters;
  proto$2.asYears = asYears;
  proto$2.valueOf = valueOf$1;
  proto$2._bubble = bubble;
  proto$2.clone = clone$1;
  proto$2.get = get$2;
  proto$2.milliseconds = milliseconds;
  proto$2.seconds = seconds;
  proto$2.minutes = minutes;
  proto$2.hours = hours;
  proto$2.days = days;
  proto$2.weeks = weeks;
  proto$2.months = months;
  proto$2.years = years;
  proto$2.humanize = humanize;
  proto$2.toISOString = toISOString$1;
  proto$2.toString = toISOString$1;
  proto$2.toJSON = toISOString$1;
  proto$2.locale = locale;
  proto$2.localeData = localeData;
  proto$2.toIsoString = deprecate('toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)', toISOString$1);
  proto$2.lang = lang;

  // FORMATTING

  addFormatToken('X', 0, 0, 'unix');
  addFormatToken('x', 0, 0, 'valueOf');

  // PARSING

  addRegexToken('x', matchSigned);
  addRegexToken('X', matchTimestamp);
  addParseToken('X', function (input, array, config) {
    config._d = new Date(parseFloat(input) * 1000);
  });
  addParseToken('x', function (input, array, config) {
    config._d = new Date(toInt(input));
  });

  //! moment.js

  hooks.version = '2.30.1';
  setHookCallback(createLocal);
  hooks.fn = proto;
  hooks.min = min;
  hooks.max = max;
  hooks.now = now;
  hooks.utc = createUTC;
  hooks.unix = createUnix;
  hooks.months = listMonths;
  hooks.isDate = isDate;
  hooks.locale = getSetGlobalLocale;
  hooks.invalid = createInvalid;
  hooks.duration = createDuration;
  hooks.isMoment = isMoment;
  hooks.weekdays = listWeekdays;
  hooks.parseZone = createInZone;
  hooks.localeData = getLocale;
  hooks.isDuration = isDuration;
  hooks.monthsShort = listMonthsShort;
  hooks.weekdaysMin = listWeekdaysMin;
  hooks.defineLocale = defineLocale;
  hooks.updateLocale = updateLocale;
  hooks.locales = listLocales;
  hooks.weekdaysShort = listWeekdaysShort;
  hooks.normalizeUnits = normalizeUnits;
  hooks.relativeTimeRounding = getSetRelativeTimeRounding;
  hooks.relativeTimeThreshold = getSetRelativeTimeThreshold;
  hooks.calendarFormat = getCalendarFormat;
  hooks.prototype = proto;

  // currently HTML5 input type only supports 24-hour formats
  hooks.HTML5_FMT = {
    DATETIME_LOCAL: 'YYYY-MM-DDTHH:mm',
    // <input type="datetime-local" />
    DATETIME_LOCAL_SECONDS: 'YYYY-MM-DDTHH:mm:ss',
    // <input type="datetime-local" step="1" />
    DATETIME_LOCAL_MS: 'YYYY-MM-DDTHH:mm:ss.SSS',
    // <input type="datetime-local" step="0.001" />
    DATE: 'YYYY-MM-DD',
    // <input type="date" />
    TIME: 'HH:mm',
    // <input type="time" />
    TIME_SECONDS: 'HH:mm:ss',
    // <input type="time" step="1" />
    TIME_MS: 'HH:mm:ss.SSS',
    // <input type="time" step="0.001" />
    WEEK: 'GGGG-[W]WW',
    // <input type="week" />
    MONTH: 'YYYY-MM' // <input type="month" />
  };
  return hooks;
});

/***/ }),

/***/ 730:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/*
 Modernizr 3.0.0pre (Custom Build) | MIT
*/


var aa = __webpack_require__(43),
  ca = __webpack_require__(853);
function p(a) {
  for (var b = "https://reactjs.org/docs/error-decoder.html?invariant=" + a, c = 1; c < arguments.length; c++) b += "&args[]=" + encodeURIComponent(arguments[c]);
  return "Minified React error #" + a + "; visit " + b + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}
var da = new Set(),
  ea = {};
function fa(a, b) {
  ha(a, b);
  ha(a + "Capture", b);
}
function ha(a, b) {
  ea[a] = b;
  for (a = 0; a < b.length; a++) da.add(b[a]);
}
var ia = !("undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement),
  ja = Object.prototype.hasOwnProperty,
  ka = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,
  la = {},
  ma = {};
function oa(a) {
  if (ja.call(ma, a)) return !0;
  if (ja.call(la, a)) return !1;
  if (ka.test(a)) return ma[a] = !0;
  la[a] = !0;
  return !1;
}
function pa(a, b, c, d) {
  if (null !== c && 0 === c.type) return !1;
  switch (typeof b) {
    case "function":
    case "symbol":
      return !0;
    case "boolean":
      if (d) return !1;
      if (null !== c) return !c.acceptsBooleans;
      a = a.toLowerCase().slice(0, 5);
      return "data-" !== a && "aria-" !== a;
    default:
      return !1;
  }
}
function qa(a, b, c, d) {
  if (null === b || "undefined" === typeof b || pa(a, b, c, d)) return !0;
  if (d) return !1;
  if (null !== c) switch (c.type) {
    case 3:
      return !b;
    case 4:
      return !1 === b;
    case 5:
      return isNaN(b);
    case 6:
      return isNaN(b) || 1 > b;
  }
  return !1;
}
function v(a, b, c, d, e, f, g) {
  this.acceptsBooleans = 2 === b || 3 === b || 4 === b;
  this.attributeName = d;
  this.attributeNamespace = e;
  this.mustUseProperty = c;
  this.propertyName = a;
  this.type = b;
  this.sanitizeURL = f;
  this.removeEmptyString = g;
}
var z = {};
"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function (a) {
  z[a] = new v(a, 0, !1, a, null, !1, !1);
});
[["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function (a) {
  var b = a[0];
  z[b] = new v(b, 1, !1, a[1], null, !1, !1);
});
["contentEditable", "draggable", "spellCheck", "value"].forEach(function (a) {
  z[a] = new v(a, 2, !1, a.toLowerCase(), null, !1, !1);
});
["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function (a) {
  z[a] = new v(a, 2, !1, a, null, !1, !1);
});
"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function (a) {
  z[a] = new v(a, 3, !1, a.toLowerCase(), null, !1, !1);
});
["checked", "multiple", "muted", "selected"].forEach(function (a) {
  z[a] = new v(a, 3, !0, a, null, !1, !1);
});
["capture", "download"].forEach(function (a) {
  z[a] = new v(a, 4, !1, a, null, !1, !1);
});
["cols", "rows", "size", "span"].forEach(function (a) {
  z[a] = new v(a, 6, !1, a, null, !1, !1);
});
["rowSpan", "start"].forEach(function (a) {
  z[a] = new v(a, 5, !1, a.toLowerCase(), null, !1, !1);
});
var ra = /[\-:]([a-z])/g;
function sa(a) {
  return a[1].toUpperCase();
}
"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function (a) {
  var b = a.replace(ra, sa);
  z[b] = new v(b, 1, !1, a, null, !1, !1);
});
"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function (a) {
  var b = a.replace(ra, sa);
  z[b] = new v(b, 1, !1, a, "http://www.w3.org/1999/xlink", !1, !1);
});
["xml:base", "xml:lang", "xml:space"].forEach(function (a) {
  var b = a.replace(ra, sa);
  z[b] = new v(b, 1, !1, a, "http://www.w3.org/XML/1998/namespace", !1, !1);
});
["tabIndex", "crossOrigin"].forEach(function (a) {
  z[a] = new v(a, 1, !1, a.toLowerCase(), null, !1, !1);
});
z.xlinkHref = new v("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1);
["src", "href", "action", "formAction"].forEach(function (a) {
  z[a] = new v(a, 1, !1, a.toLowerCase(), null, !0, !0);
});
function ta(a, b, c, d) {
  var e = z.hasOwnProperty(b) ? z[b] : null;
  if (null !== e ? 0 !== e.type : d || !(2 < b.length) || "o" !== b[0] && "O" !== b[0] || "n" !== b[1] && "N" !== b[1]) qa(b, c, e, d) && (c = null), d || null === e ? oa(b) && (null === c ? a.removeAttribute(b) : a.setAttribute(b, "" + c)) : e.mustUseProperty ? a[e.propertyName] = null === c ? 3 === e.type ? !1 : "" : c : (b = e.attributeName, d = e.attributeNamespace, null === c ? a.removeAttribute(b) : (e = e.type, c = 3 === e || 4 === e && !0 === c ? "" : "" + c, d ? a.setAttributeNS(d, b, c) : a.setAttribute(b, c)));
}
var ua = aa.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
  va = Symbol.for("react.element"),
  wa = Symbol.for("react.portal"),
  ya = Symbol.for("react.fragment"),
  za = Symbol.for("react.strict_mode"),
  Aa = Symbol.for("react.profiler"),
  Ba = Symbol.for("react.provider"),
  Ca = Symbol.for("react.context"),
  Da = Symbol.for("react.forward_ref"),
  Ea = Symbol.for("react.suspense"),
  Fa = Symbol.for("react.suspense_list"),
  Ga = Symbol.for("react.memo"),
  Ha = Symbol.for("react.lazy");
Symbol.for("react.scope");
Symbol.for("react.debug_trace_mode");
var Ia = Symbol.for("react.offscreen");
Symbol.for("react.legacy_hidden");
Symbol.for("react.cache");
Symbol.for("react.tracing_marker");
var Ja = Symbol.iterator;
function Ka(a) {
  if (null === a || "object" !== typeof a) return null;
  a = Ja && a[Ja] || a["@@iterator"];
  return "function" === typeof a ? a : null;
}
var A = Object.assign,
  La;
function Ma(a) {
  if (void 0 === La) try {
    throw Error();
  } catch (c) {
    var b = c.stack.trim().match(/\n( *(at )?)/);
    La = b && b[1] || "";
  }
  return "\n" + La + a;
}
var Na = !1;
function Oa(a, b) {
  if (!a || Na) return "";
  Na = !0;
  var c = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  try {
    if (b) {
      if (b = function () {
        throw Error();
      }, Object.defineProperty(b.prototype, "props", {
        set: function () {
          throw Error();
        }
      }), "object" === typeof Reflect && Reflect.construct) {
        try {
          Reflect.construct(b, []);
        } catch (l) {
          var d = l;
        }
        Reflect.construct(a, [], b);
      } else {
        try {
          b.call();
        } catch (l) {
          d = l;
        }
        a.call(b.prototype);
      }
    } else {
      try {
        throw Error();
      } catch (l) {
        d = l;
      }
      a();
    }
  } catch (l) {
    if (l && d && "string" === typeof l.stack) {
      for (var e = l.stack.split("\n"), f = d.stack.split("\n"), g = e.length - 1, h = f.length - 1; 1 <= g && 0 <= h && e[g] !== f[h];) h--;
      for (; 1 <= g && 0 <= h; g--, h--) if (e[g] !== f[h]) {
        if (1 !== g || 1 !== h) {
          do if (g--, h--, 0 > h || e[g] !== f[h]) {
            var k = "\n" + e[g].replace(" at new ", " at ");
            a.displayName && k.includes("<anonymous>") && (k = k.replace("<anonymous>", a.displayName));
            return k;
          } while (1 <= g && 0 <= h);
        }
        break;
      }
    }
  } finally {
    Na = !1, Error.prepareStackTrace = c;
  }
  return (a = a ? a.displayName || a.name : "") ? Ma(a) : "";
}
function Pa(a) {
  switch (a.tag) {
    case 5:
      return Ma(a.type);
    case 16:
      return Ma("Lazy");
    case 13:
      return Ma("Suspense");
    case 19:
      return Ma("SuspenseList");
    case 0:
    case 2:
    case 15:
      return a = Oa(a.type, !1), a;
    case 11:
      return a = Oa(a.type.render, !1), a;
    case 1:
      return a = Oa(a.type, !0), a;
    default:
      return "";
  }
}
function Qa(a) {
  if (null == a) return null;
  if ("function" === typeof a) return a.displayName || a.name || null;
  if ("string" === typeof a) return a;
  switch (a) {
    case ya:
      return "Fragment";
    case wa:
      return "Portal";
    case Aa:
      return "Profiler";
    case za:
      return "StrictMode";
    case Ea:
      return "Suspense";
    case Fa:
      return "SuspenseList";
  }
  if ("object" === typeof a) switch (a.$$typeof) {
    case Ca:
      return (a.displayName || "Context") + ".Consumer";
    case Ba:
      return (a._context.displayName || "Context") + ".Provider";
    case Da:
      var b = a.render;
      a = a.displayName;
      a || (a = b.displayName || b.name || "", a = "" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
      return a;
    case Ga:
      return b = a.displayName || null, null !== b ? b : Qa(a.type) || "Memo";
    case Ha:
      b = a._payload;
      a = a._init;
      try {
        return Qa(a(b));
      } catch (c) {}
  }
  return null;
}
function Ra(a) {
  var b = a.type;
  switch (a.tag) {
    case 24:
      return "Cache";
    case 9:
      return (b.displayName || "Context") + ".Consumer";
    case 10:
      return (b._context.displayName || "Context") + ".Provider";
    case 18:
      return "DehydratedFragment";
    case 11:
      return a = b.render, a = a.displayName || a.name || "", b.displayName || ("" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
    case 7:
      return "Fragment";
    case 5:
      return b;
    case 4:
      return "Portal";
    case 3:
      return "Root";
    case 6:
      return "Text";
    case 16:
      return Qa(b);
    case 8:
      return b === za ? "StrictMode" : "Mode";
    case 22:
      return "Offscreen";
    case 12:
      return "Profiler";
    case 21:
      return "Scope";
    case 13:
      return "Suspense";
    case 19:
      return "SuspenseList";
    case 25:
      return "TracingMarker";
    case 1:
    case 0:
    case 17:
    case 2:
    case 14:
    case 15:
      if ("function" === typeof b) return b.displayName || b.name || null;
      if ("string" === typeof b) return b;
  }
  return null;
}
function Sa(a) {
  switch (typeof a) {
    case "boolean":
    case "number":
    case "string":
    case "undefined":
      return a;
    case "object":
      return a;
    default:
      return "";
  }
}
function Ta(a) {
  var b = a.type;
  return (a = a.nodeName) && "input" === a.toLowerCase() && ("checkbox" === b || "radio" === b);
}
function Ua(a) {
  var b = Ta(a) ? "checked" : "value",
    c = Object.getOwnPropertyDescriptor(a.constructor.prototype, b),
    d = "" + a[b];
  if (!a.hasOwnProperty(b) && "undefined" !== typeof c && "function" === typeof c.get && "function" === typeof c.set) {
    var e = c.get,
      f = c.set;
    Object.defineProperty(a, b, {
      configurable: !0,
      get: function () {
        return e.call(this);
      },
      set: function (a) {
        d = "" + a;
        f.call(this, a);
      }
    });
    Object.defineProperty(a, b, {
      enumerable: c.enumerable
    });
    return {
      getValue: function () {
        return d;
      },
      setValue: function (a) {
        d = "" + a;
      },
      stopTracking: function () {
        a._valueTracker = null;
        delete a[b];
      }
    };
  }
}
function Va(a) {
  a._valueTracker || (a._valueTracker = Ua(a));
}
function Wa(a) {
  if (!a) return !1;
  var b = a._valueTracker;
  if (!b) return !0;
  var c = b.getValue();
  var d = "";
  a && (d = Ta(a) ? a.checked ? "true" : "false" : a.value);
  a = d;
  return a !== c ? (b.setValue(a), !0) : !1;
}
function Xa(a) {
  a = a || ("undefined" !== typeof document ? document : void 0);
  if ("undefined" === typeof a) return null;
  try {
    return a.activeElement || a.body;
  } catch (b) {
    return a.body;
  }
}
function Ya(a, b) {
  var c = b.checked;
  return A({}, b, {
    defaultChecked: void 0,
    defaultValue: void 0,
    value: void 0,
    checked: null != c ? c : a._wrapperState.initialChecked
  });
}
function Za(a, b) {
  var c = null == b.defaultValue ? "" : b.defaultValue,
    d = null != b.checked ? b.checked : b.defaultChecked;
  c = Sa(null != b.value ? b.value : c);
  a._wrapperState = {
    initialChecked: d,
    initialValue: c,
    controlled: "checkbox" === b.type || "radio" === b.type ? null != b.checked : null != b.value
  };
}
function ab(a, b) {
  b = b.checked;
  null != b && ta(a, "checked", b, !1);
}
function bb(a, b) {
  ab(a, b);
  var c = Sa(b.value),
    d = b.type;
  if (null != c) {
    if ("number" === d) {
      if (0 === c && "" === a.value || a.value != c) a.value = "" + c;
    } else a.value !== "" + c && (a.value = "" + c);
  } else if ("submit" === d || "reset" === d) {
    a.removeAttribute("value");
    return;
  }
  b.hasOwnProperty("value") ? cb(a, b.type, c) : b.hasOwnProperty("defaultValue") && cb(a, b.type, Sa(b.defaultValue));
  null == b.checked && null != b.defaultChecked && (a.defaultChecked = !!b.defaultChecked);
}
function db(a, b, c) {
  if (b.hasOwnProperty("value") || b.hasOwnProperty("defaultValue")) {
    var d = b.type;
    if (!("submit" !== d && "reset" !== d || void 0 !== b.value && null !== b.value)) return;
    b = "" + a._wrapperState.initialValue;
    c || b === a.value || (a.value = b);
    a.defaultValue = b;
  }
  c = a.name;
  "" !== c && (a.name = "");
  a.defaultChecked = !!a._wrapperState.initialChecked;
  "" !== c && (a.name = c);
}
function cb(a, b, c) {
  if ("number" !== b || Xa(a.ownerDocument) !== a) null == c ? a.defaultValue = "" + a._wrapperState.initialValue : a.defaultValue !== "" + c && (a.defaultValue = "" + c);
}
var eb = Array.isArray;
function fb(a, b, c, d) {
  a = a.options;
  if (b) {
    b = {};
    for (var e = 0; e < c.length; e++) b["$" + c[e]] = !0;
    for (c = 0; c < a.length; c++) e = b.hasOwnProperty("$" + a[c].value), a[c].selected !== e && (a[c].selected = e), e && d && (a[c].defaultSelected = !0);
  } else {
    c = "" + Sa(c);
    b = null;
    for (e = 0; e < a.length; e++) {
      if (a[e].value === c) {
        a[e].selected = !0;
        d && (a[e].defaultSelected = !0);
        return;
      }
      null !== b || a[e].disabled || (b = a[e]);
    }
    null !== b && (b.selected = !0);
  }
}
function gb(a, b) {
  if (null != b.dangerouslySetInnerHTML) throw Error(p(91));
  return A({}, b, {
    value: void 0,
    defaultValue: void 0,
    children: "" + a._wrapperState.initialValue
  });
}
function hb(a, b) {
  var c = b.value;
  if (null == c) {
    c = b.children;
    b = b.defaultValue;
    if (null != c) {
      if (null != b) throw Error(p(92));
      if (eb(c)) {
        if (1 < c.length) throw Error(p(93));
        c = c[0];
      }
      b = c;
    }
    null == b && (b = "");
    c = b;
  }
  a._wrapperState = {
    initialValue: Sa(c)
  };
}
function ib(a, b) {
  var c = Sa(b.value),
    d = Sa(b.defaultValue);
  null != c && (c = "" + c, c !== a.value && (a.value = c), null == b.defaultValue && a.defaultValue !== c && (a.defaultValue = c));
  null != d && (a.defaultValue = "" + d);
}
function jb(a) {
  var b = a.textContent;
  b === a._wrapperState.initialValue && "" !== b && null !== b && (a.value = b);
}
function kb(a) {
  switch (a) {
    case "svg":
      return "http://www.w3.org/2000/svg";
    case "math":
      return "http://www.w3.org/1998/Math/MathML";
    default:
      return "http://www.w3.org/1999/xhtml";
  }
}
function lb(a, b) {
  return null == a || "http://www.w3.org/1999/xhtml" === a ? kb(b) : "http://www.w3.org/2000/svg" === a && "foreignObject" === b ? "http://www.w3.org/1999/xhtml" : a;
}
var mb,
  nb = function (a) {
    return "undefined" !== typeof MSApp && MSApp.execUnsafeLocalFunction ? function (b, c, d, e) {
      MSApp.execUnsafeLocalFunction(function () {
        return a(b, c, d, e);
      });
    } : a;
  }(function (a, b) {
    if ("http://www.w3.org/2000/svg" !== a.namespaceURI || "innerHTML" in a) a.innerHTML = b;else {
      mb = mb || document.createElement("div");
      mb.innerHTML = "<svg>" + b.valueOf().toString() + "</svg>";
      for (b = mb.firstChild; a.firstChild;) a.removeChild(a.firstChild);
      for (; b.firstChild;) a.appendChild(b.firstChild);
    }
  });
function ob(a, b) {
  if (b) {
    var c = a.firstChild;
    if (c && c === a.lastChild && 3 === c.nodeType) {
      c.nodeValue = b;
      return;
    }
  }
  a.textContent = b;
}
var pb = {
    animationIterationCount: !0,
    aspectRatio: !0,
    borderImageOutset: !0,
    borderImageSlice: !0,
    borderImageWidth: !0,
    boxFlex: !0,
    boxFlexGroup: !0,
    boxOrdinalGroup: !0,
    columnCount: !0,
    columns: !0,
    flex: !0,
    flexGrow: !0,
    flexPositive: !0,
    flexShrink: !0,
    flexNegative: !0,
    flexOrder: !0,
    gridArea: !0,
    gridRow: !0,
    gridRowEnd: !0,
    gridRowSpan: !0,
    gridRowStart: !0,
    gridColumn: !0,
    gridColumnEnd: !0,
    gridColumnSpan: !0,
    gridColumnStart: !0,
    fontWeight: !0,
    lineClamp: !0,
    lineHeight: !0,
    opacity: !0,
    order: !0,
    orphans: !0,
    tabSize: !0,
    widows: !0,
    zIndex: !0,
    zoom: !0,
    fillOpacity: !0,
    floodOpacity: !0,
    stopOpacity: !0,
    strokeDasharray: !0,
    strokeDashoffset: !0,
    strokeMiterlimit: !0,
    strokeOpacity: !0,
    strokeWidth: !0
  },
  qb = ["Webkit", "ms", "Moz", "O"];
Object.keys(pb).forEach(function (a) {
  qb.forEach(function (b) {
    b = b + a.charAt(0).toUpperCase() + a.substring(1);
    pb[b] = pb[a];
  });
});
function rb(a, b, c) {
  return null == b || "boolean" === typeof b || "" === b ? "" : c || "number" !== typeof b || 0 === b || pb.hasOwnProperty(a) && pb[a] ? ("" + b).trim() : b + "px";
}
function sb(a, b) {
  a = a.style;
  for (var c in b) if (b.hasOwnProperty(c)) {
    var d = 0 === c.indexOf("--"),
      e = rb(c, b[c], d);
    "float" === c && (c = "cssFloat");
    d ? a.setProperty(c, e) : a[c] = e;
  }
}
var tb = A({
  menuitem: !0
}, {
  area: !0,
  base: !0,
  br: !0,
  col: !0,
  embed: !0,
  hr: !0,
  img: !0,
  input: !0,
  keygen: !0,
  link: !0,
  meta: !0,
  param: !0,
  source: !0,
  track: !0,
  wbr: !0
});
function ub(a, b) {
  if (b) {
    if (tb[a] && (null != b.children || null != b.dangerouslySetInnerHTML)) throw Error(p(137, a));
    if (null != b.dangerouslySetInnerHTML) {
      if (null != b.children) throw Error(p(60));
      if ("object" !== typeof b.dangerouslySetInnerHTML || !("__html" in b.dangerouslySetInnerHTML)) throw Error(p(61));
    }
    if (null != b.style && "object" !== typeof b.style) throw Error(p(62));
  }
}
function vb(a, b) {
  if (-1 === a.indexOf("-")) return "string" === typeof b.is;
  switch (a) {
    case "annotation-xml":
    case "color-profile":
    case "font-face":
    case "font-face-src":
    case "font-face-uri":
    case "font-face-format":
    case "font-face-name":
    case "missing-glyph":
      return !1;
    default:
      return !0;
  }
}
var wb = null;
function xb(a) {
  a = a.target || a.srcElement || window;
  a.correspondingUseElement && (a = a.correspondingUseElement);
  return 3 === a.nodeType ? a.parentNode : a;
}
var yb = null,
  zb = null,
  Ab = null;
function Bb(a) {
  if (a = Cb(a)) {
    if ("function" !== typeof yb) throw Error(p(280));
    var b = a.stateNode;
    b && (b = Db(b), yb(a.stateNode, a.type, b));
  }
}
function Eb(a) {
  zb ? Ab ? Ab.push(a) : Ab = [a] : zb = a;
}
function Fb() {
  if (zb) {
    var a = zb,
      b = Ab;
    Ab = zb = null;
    Bb(a);
    if (b) for (a = 0; a < b.length; a++) Bb(b[a]);
  }
}
function Gb(a, b) {
  return a(b);
}
function Hb() {}
var Ib = !1;
function Jb(a, b, c) {
  if (Ib) return a(b, c);
  Ib = !0;
  try {
    return Gb(a, b, c);
  } finally {
    if (Ib = !1, null !== zb || null !== Ab) Hb(), Fb();
  }
}
function Kb(a, b) {
  var c = a.stateNode;
  if (null === c) return null;
  var d = Db(c);
  if (null === d) return null;
  c = d[b];
  a: switch (b) {
    case "onClick":
    case "onClickCapture":
    case "onDoubleClick":
    case "onDoubleClickCapture":
    case "onMouseDown":
    case "onMouseDownCapture":
    case "onMouseMove":
    case "onMouseMoveCapture":
    case "onMouseUp":
    case "onMouseUpCapture":
    case "onMouseEnter":
      (d = !d.disabled) || (a = a.type, d = !("button" === a || "input" === a || "select" === a || "textarea" === a));
      a = !d;
      break a;
    default:
      a = !1;
  }
  if (a) return null;
  if (c && "function" !== typeof c) throw Error(p(231, b, typeof c));
  return c;
}
var Lb = !1;
if (ia) try {
  var Mb = {};
  Object.defineProperty(Mb, "passive", {
    get: function () {
      Lb = !0;
    }
  });
  window.addEventListener("test", Mb, Mb);
  window.removeEventListener("test", Mb, Mb);
} catch (a) {
  Lb = !1;
}
function Nb(a, b, c, d, e, f, g, h, k) {
  var l = Array.prototype.slice.call(arguments, 3);
  try {
    b.apply(c, l);
  } catch (m) {
    this.onError(m);
  }
}
var Ob = !1,
  Pb = null,
  Qb = !1,
  Rb = null,
  Sb = {
    onError: function (a) {
      Ob = !0;
      Pb = a;
    }
  };
function Tb(a, b, c, d, e, f, g, h, k) {
  Ob = !1;
  Pb = null;
  Nb.apply(Sb, arguments);
}
function Ub(a, b, c, d, e, f, g, h, k) {
  Tb.apply(this, arguments);
  if (Ob) {
    if (Ob) {
      var l = Pb;
      Ob = !1;
      Pb = null;
    } else throw Error(p(198));
    Qb || (Qb = !0, Rb = l);
  }
}
function Vb(a) {
  var b = a,
    c = a;
  if (a.alternate) for (; b.return;) b = b.return;else {
    a = b;
    do b = a, 0 !== (b.flags & 4098) && (c = b.return), a = b.return; while (a);
  }
  return 3 === b.tag ? c : null;
}
function Wb(a) {
  if (13 === a.tag) {
    var b = a.memoizedState;
    null === b && (a = a.alternate, null !== a && (b = a.memoizedState));
    if (null !== b) return b.dehydrated;
  }
  return null;
}
function Xb(a) {
  if (Vb(a) !== a) throw Error(p(188));
}
function Yb(a) {
  var b = a.alternate;
  if (!b) {
    b = Vb(a);
    if (null === b) throw Error(p(188));
    return b !== a ? null : a;
  }
  for (var c = a, d = b;;) {
    var e = c.return;
    if (null === e) break;
    var f = e.alternate;
    if (null === f) {
      d = e.return;
      if (null !== d) {
        c = d;
        continue;
      }
      break;
    }
    if (e.child === f.child) {
      for (f = e.child; f;) {
        if (f === c) return Xb(e), a;
        if (f === d) return Xb(e), b;
        f = f.sibling;
      }
      throw Error(p(188));
    }
    if (c.return !== d.return) c = e, d = f;else {
      for (var g = !1, h = e.child; h;) {
        if (h === c) {
          g = !0;
          c = e;
          d = f;
          break;
        }
        if (h === d) {
          g = !0;
          d = e;
          c = f;
          break;
        }
        h = h.sibling;
      }
      if (!g) {
        for (h = f.child; h;) {
          if (h === c) {
            g = !0;
            c = f;
            d = e;
            break;
          }
          if (h === d) {
            g = !0;
            d = f;
            c = e;
            break;
          }
          h = h.sibling;
        }
        if (!g) throw Error(p(189));
      }
    }
    if (c.alternate !== d) throw Error(p(190));
  }
  if (3 !== c.tag) throw Error(p(188));
  return c.stateNode.current === c ? a : b;
}
function Zb(a) {
  a = Yb(a);
  return null !== a ? $b(a) : null;
}
function $b(a) {
  if (5 === a.tag || 6 === a.tag) return a;
  for (a = a.child; null !== a;) {
    var b = $b(a);
    if (null !== b) return b;
    a = a.sibling;
  }
  return null;
}
var ac = ca.unstable_scheduleCallback,
  bc = ca.unstable_cancelCallback,
  cc = ca.unstable_shouldYield,
  dc = ca.unstable_requestPaint,
  B = ca.unstable_now,
  ec = ca.unstable_getCurrentPriorityLevel,
  fc = ca.unstable_ImmediatePriority,
  gc = ca.unstable_UserBlockingPriority,
  hc = ca.unstable_NormalPriority,
  ic = ca.unstable_LowPriority,
  jc = ca.unstable_IdlePriority,
  kc = null,
  lc = null;
function mc(a) {
  if (lc && "function" === typeof lc.onCommitFiberRoot) try {
    lc.onCommitFiberRoot(kc, a, void 0, 128 === (a.current.flags & 128));
  } catch (b) {}
}
var oc = Math.clz32 ? Math.clz32 : nc,
  pc = Math.log,
  qc = Math.LN2;
function nc(a) {
  a >>>= 0;
  return 0 === a ? 32 : 31 - (pc(a) / qc | 0) | 0;
}
var rc = 64,
  sc = 4194304;
function tc(a) {
  switch (a & -a) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 4:
      return 4;
    case 8:
      return 8;
    case 16:
      return 16;
    case 32:
      return 32;
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return a & 4194240;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return a & 130023424;
    case 134217728:
      return 134217728;
    case 268435456:
      return 268435456;
    case 536870912:
      return 536870912;
    case 1073741824:
      return 1073741824;
    default:
      return a;
  }
}
function uc(a, b) {
  var c = a.pendingLanes;
  if (0 === c) return 0;
  var d = 0,
    e = a.suspendedLanes,
    f = a.pingedLanes,
    g = c & 268435455;
  if (0 !== g) {
    var h = g & ~e;
    0 !== h ? d = tc(h) : (f &= g, 0 !== f && (d = tc(f)));
  } else g = c & ~e, 0 !== g ? d = tc(g) : 0 !== f && (d = tc(f));
  if (0 === d) return 0;
  if (0 !== b && b !== d && 0 === (b & e) && (e = d & -d, f = b & -b, e >= f || 16 === e && 0 !== (f & 4194240))) return b;
  0 !== (d & 4) && (d |= c & 16);
  b = a.entangledLanes;
  if (0 !== b) for (a = a.entanglements, b &= d; 0 < b;) c = 31 - oc(b), e = 1 << c, d |= a[c], b &= ~e;
  return d;
}
function vc(a, b) {
  switch (a) {
    case 1:
    case 2:
    case 4:
      return b + 250;
    case 8:
    case 16:
    case 32:
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return b + 5E3;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return -1;
    case 134217728:
    case 268435456:
    case 536870912:
    case 1073741824:
      return -1;
    default:
      return -1;
  }
}
function wc(a, b) {
  for (var c = a.suspendedLanes, d = a.pingedLanes, e = a.expirationTimes, f = a.pendingLanes; 0 < f;) {
    var g = 31 - oc(f),
      h = 1 << g,
      k = e[g];
    if (-1 === k) {
      if (0 === (h & c) || 0 !== (h & d)) e[g] = vc(h, b);
    } else k <= b && (a.expiredLanes |= h);
    f &= ~h;
  }
}
function xc(a) {
  a = a.pendingLanes & -1073741825;
  return 0 !== a ? a : a & 1073741824 ? 1073741824 : 0;
}
function yc() {
  var a = rc;
  rc <<= 1;
  0 === (rc & 4194240) && (rc = 64);
  return a;
}
function zc(a) {
  for (var b = [], c = 0; 31 > c; c++) b.push(a);
  return b;
}
function Ac(a, b, c) {
  a.pendingLanes |= b;
  536870912 !== b && (a.suspendedLanes = 0, a.pingedLanes = 0);
  a = a.eventTimes;
  b = 31 - oc(b);
  a[b] = c;
}
function Bc(a, b) {
  var c = a.pendingLanes & ~b;
  a.pendingLanes = b;
  a.suspendedLanes = 0;
  a.pingedLanes = 0;
  a.expiredLanes &= b;
  a.mutableReadLanes &= b;
  a.entangledLanes &= b;
  b = a.entanglements;
  var d = a.eventTimes;
  for (a = a.expirationTimes; 0 < c;) {
    var e = 31 - oc(c),
      f = 1 << e;
    b[e] = 0;
    d[e] = -1;
    a[e] = -1;
    c &= ~f;
  }
}
function Cc(a, b) {
  var c = a.entangledLanes |= b;
  for (a = a.entanglements; c;) {
    var d = 31 - oc(c),
      e = 1 << d;
    e & b | a[d] & b && (a[d] |= b);
    c &= ~e;
  }
}
var C = 0;
function Dc(a) {
  a &= -a;
  return 1 < a ? 4 < a ? 0 !== (a & 268435455) ? 16 : 536870912 : 4 : 1;
}
var Ec,
  Fc,
  Gc,
  Hc,
  Ic,
  Jc = !1,
  Kc = [],
  Lc = null,
  Mc = null,
  Nc = null,
  Oc = new Map(),
  Pc = new Map(),
  Qc = [],
  Rc = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
function Sc(a, b) {
  switch (a) {
    case "focusin":
    case "focusout":
      Lc = null;
      break;
    case "dragenter":
    case "dragleave":
      Mc = null;
      break;
    case "mouseover":
    case "mouseout":
      Nc = null;
      break;
    case "pointerover":
    case "pointerout":
      Oc.delete(b.pointerId);
      break;
    case "gotpointercapture":
    case "lostpointercapture":
      Pc.delete(b.pointerId);
  }
}
function Tc(a, b, c, d, e, f) {
  if (null === a || a.nativeEvent !== f) return a = {
    blockedOn: b,
    domEventName: c,
    eventSystemFlags: d,
    nativeEvent: f,
    targetContainers: [e]
  }, null !== b && (b = Cb(b), null !== b && Fc(b)), a;
  a.eventSystemFlags |= d;
  b = a.targetContainers;
  null !== e && -1 === b.indexOf(e) && b.push(e);
  return a;
}
function Uc(a, b, c, d, e) {
  switch (b) {
    case "focusin":
      return Lc = Tc(Lc, a, b, c, d, e), !0;
    case "dragenter":
      return Mc = Tc(Mc, a, b, c, d, e), !0;
    case "mouseover":
      return Nc = Tc(Nc, a, b, c, d, e), !0;
    case "pointerover":
      var f = e.pointerId;
      Oc.set(f, Tc(Oc.get(f) || null, a, b, c, d, e));
      return !0;
    case "gotpointercapture":
      return f = e.pointerId, Pc.set(f, Tc(Pc.get(f) || null, a, b, c, d, e)), !0;
  }
  return !1;
}
function Vc(a) {
  var b = Wc(a.target);
  if (null !== b) {
    var c = Vb(b);
    if (null !== c) if (b = c.tag, 13 === b) {
      if (b = Wb(c), null !== b) {
        a.blockedOn = b;
        Ic(a.priority, function () {
          Gc(c);
        });
        return;
      }
    } else if (3 === b && c.stateNode.current.memoizedState.isDehydrated) {
      a.blockedOn = 3 === c.tag ? c.stateNode.containerInfo : null;
      return;
    }
  }
  a.blockedOn = null;
}
function Xc(a) {
  if (null !== a.blockedOn) return !1;
  for (var b = a.targetContainers; 0 < b.length;) {
    var c = Yc(a.domEventName, a.eventSystemFlags, b[0], a.nativeEvent);
    if (null === c) {
      c = a.nativeEvent;
      var d = new c.constructor(c.type, c);
      wb = d;
      c.target.dispatchEvent(d);
      wb = null;
    } else return b = Cb(c), null !== b && Fc(b), a.blockedOn = c, !1;
    b.shift();
  }
  return !0;
}
function Zc(a, b, c) {
  Xc(a) && c.delete(b);
}
function $c() {
  Jc = !1;
  null !== Lc && Xc(Lc) && (Lc = null);
  null !== Mc && Xc(Mc) && (Mc = null);
  null !== Nc && Xc(Nc) && (Nc = null);
  Oc.forEach(Zc);
  Pc.forEach(Zc);
}
function ad(a, b) {
  a.blockedOn === b && (a.blockedOn = null, Jc || (Jc = !0, ca.unstable_scheduleCallback(ca.unstable_NormalPriority, $c)));
}
function bd(a) {
  function b(b) {
    return ad(b, a);
  }
  if (0 < Kc.length) {
    ad(Kc[0], a);
    for (var c = 1; c < Kc.length; c++) {
      var d = Kc[c];
      d.blockedOn === a && (d.blockedOn = null);
    }
  }
  null !== Lc && ad(Lc, a);
  null !== Mc && ad(Mc, a);
  null !== Nc && ad(Nc, a);
  Oc.forEach(b);
  Pc.forEach(b);
  for (c = 0; c < Qc.length; c++) d = Qc[c], d.blockedOn === a && (d.blockedOn = null);
  for (; 0 < Qc.length && (c = Qc[0], null === c.blockedOn);) Vc(c), null === c.blockedOn && Qc.shift();
}
var cd = ua.ReactCurrentBatchConfig,
  dd = !0;
function ed(a, b, c, d) {
  var e = C,
    f = cd.transition;
  cd.transition = null;
  try {
    C = 1, fd(a, b, c, d);
  } finally {
    C = e, cd.transition = f;
  }
}
function gd(a, b, c, d) {
  var e = C,
    f = cd.transition;
  cd.transition = null;
  try {
    C = 4, fd(a, b, c, d);
  } finally {
    C = e, cd.transition = f;
  }
}
function fd(a, b, c, d) {
  if (dd) {
    var e = Yc(a, b, c, d);
    if (null === e) hd(a, b, d, id, c), Sc(a, d);else if (Uc(e, a, b, c, d)) d.stopPropagation();else if (Sc(a, d), b & 4 && -1 < Rc.indexOf(a)) {
      for (; null !== e;) {
        var f = Cb(e);
        null !== f && Ec(f);
        f = Yc(a, b, c, d);
        null === f && hd(a, b, d, id, c);
        if (f === e) break;
        e = f;
      }
      null !== e && d.stopPropagation();
    } else hd(a, b, d, null, c);
  }
}
var id = null;
function Yc(a, b, c, d) {
  id = null;
  a = xb(d);
  a = Wc(a);
  if (null !== a) if (b = Vb(a), null === b) a = null;else if (c = b.tag, 13 === c) {
    a = Wb(b);
    if (null !== a) return a;
    a = null;
  } else if (3 === c) {
    if (b.stateNode.current.memoizedState.isDehydrated) return 3 === b.tag ? b.stateNode.containerInfo : null;
    a = null;
  } else b !== a && (a = null);
  id = a;
  return null;
}
function jd(a) {
  switch (a) {
    case "cancel":
    case "click":
    case "close":
    case "contextmenu":
    case "copy":
    case "cut":
    case "auxclick":
    case "dblclick":
    case "dragend":
    case "dragstart":
    case "drop":
    case "focusin":
    case "focusout":
    case "input":
    case "invalid":
    case "keydown":
    case "keypress":
    case "keyup":
    case "mousedown":
    case "mouseup":
    case "paste":
    case "pause":
    case "play":
    case "pointercancel":
    case "pointerdown":
    case "pointerup":
    case "ratechange":
    case "reset":
    case "resize":
    case "seeked":
    case "submit":
    case "touchcancel":
    case "touchend":
    case "touchstart":
    case "volumechange":
    case "change":
    case "selectionchange":
    case "textInput":
    case "compositionstart":
    case "compositionend":
    case "compositionupdate":
    case "beforeblur":
    case "afterblur":
    case "beforeinput":
    case "blur":
    case "fullscreenchange":
    case "focus":
    case "hashchange":
    case "popstate":
    case "select":
    case "selectstart":
      return 1;
    case "drag":
    case "dragenter":
    case "dragexit":
    case "dragleave":
    case "dragover":
    case "mousemove":
    case "mouseout":
    case "mouseover":
    case "pointermove":
    case "pointerout":
    case "pointerover":
    case "scroll":
    case "toggle":
    case "touchmove":
    case "wheel":
    case "mouseenter":
    case "mouseleave":
    case "pointerenter":
    case "pointerleave":
      return 4;
    case "message":
      switch (ec()) {
        case fc:
          return 1;
        case gc:
          return 4;
        case hc:
        case ic:
          return 16;
        case jc:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var kd = null,
  ld = null,
  md = null;
function nd() {
  if (md) return md;
  var a,
    b = ld,
    c = b.length,
    d,
    e = "value" in kd ? kd.value : kd.textContent,
    f = e.length;
  for (a = 0; a < c && b[a] === e[a]; a++);
  var g = c - a;
  for (d = 1; d <= g && b[c - d] === e[f - d]; d++);
  return md = e.slice(a, 1 < d ? 1 - d : void 0);
}
function od(a) {
  var b = a.keyCode;
  "charCode" in a ? (a = a.charCode, 0 === a && 13 === b && (a = 13)) : a = b;
  10 === a && (a = 13);
  return 32 <= a || 13 === a ? a : 0;
}
function pd() {
  return !0;
}
function qd() {
  return !1;
}
function rd(a) {
  function b(b, d, e, f, g) {
    this._reactName = b;
    this._targetInst = e;
    this.type = d;
    this.nativeEvent = f;
    this.target = g;
    this.currentTarget = null;
    for (var c in a) a.hasOwnProperty(c) && (b = a[c], this[c] = b ? b(f) : f[c]);
    this.isDefaultPrevented = (null != f.defaultPrevented ? f.defaultPrevented : !1 === f.returnValue) ? pd : qd;
    this.isPropagationStopped = qd;
    return this;
  }
  A(b.prototype, {
    preventDefault: function () {
      this.defaultPrevented = !0;
      var a = this.nativeEvent;
      a && (a.preventDefault ? a.preventDefault() : "unknown" !== typeof a.returnValue && (a.returnValue = !1), this.isDefaultPrevented = pd);
    },
    stopPropagation: function () {
      var a = this.nativeEvent;
      a && (a.stopPropagation ? a.stopPropagation() : "unknown" !== typeof a.cancelBubble && (a.cancelBubble = !0), this.isPropagationStopped = pd);
    },
    persist: function () {},
    isPersistent: pd
  });
  return b;
}
var sd = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function (a) {
      return a.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  },
  td = rd(sd),
  ud = A({}, sd, {
    view: 0,
    detail: 0
  }),
  vd = rd(ud),
  wd,
  xd,
  yd,
  Ad = A({}, ud, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: zd,
    button: 0,
    buttons: 0,
    relatedTarget: function (a) {
      return void 0 === a.relatedTarget ? a.fromElement === a.srcElement ? a.toElement : a.fromElement : a.relatedTarget;
    },
    movementX: function (a) {
      if ("movementX" in a) return a.movementX;
      a !== yd && (yd && "mousemove" === a.type ? (wd = a.screenX - yd.screenX, xd = a.screenY - yd.screenY) : xd = wd = 0, yd = a);
      return wd;
    },
    movementY: function (a) {
      return "movementY" in a ? a.movementY : xd;
    }
  }),
  Bd = rd(Ad),
  Cd = A({}, Ad, {
    dataTransfer: 0
  }),
  Dd = rd(Cd),
  Ed = A({}, ud, {
    relatedTarget: 0
  }),
  Fd = rd(Ed),
  Gd = A({}, sd, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }),
  Hd = rd(Gd),
  Id = A({}, sd, {
    clipboardData: function (a) {
      return "clipboardData" in a ? a.clipboardData : window.clipboardData;
    }
  }),
  Jd = rd(Id),
  Kd = A({}, sd, {
    data: 0
  }),
  Ld = rd(Kd),
  Md = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified"
  },
  Nd = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta"
  },
  Od = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
function Pd(a) {
  var b = this.nativeEvent;
  return b.getModifierState ? b.getModifierState(a) : (a = Od[a]) ? !!b[a] : !1;
}
function zd() {
  return Pd;
}
var Qd = A({}, ud, {
    key: function (a) {
      if (a.key) {
        var b = Md[a.key] || a.key;
        if ("Unidentified" !== b) return b;
      }
      return "keypress" === a.type ? (a = od(a), 13 === a ? "Enter" : String.fromCharCode(a)) : "keydown" === a.type || "keyup" === a.type ? Nd[a.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: zd,
    charCode: function (a) {
      return "keypress" === a.type ? od(a) : 0;
    },
    keyCode: function (a) {
      return "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
    },
    which: function (a) {
      return "keypress" === a.type ? od(a) : "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
    }
  }),
  Rd = rd(Qd),
  Sd = A({}, Ad, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0
  }),
  Td = rd(Sd),
  Ud = A({}, ud, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: zd
  }),
  Vd = rd(Ud),
  Wd = A({}, sd, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }),
  Xd = rd(Wd),
  Yd = A({}, Ad, {
    deltaX: function (a) {
      return "deltaX" in a ? a.deltaX : "wheelDeltaX" in a ? -a.wheelDeltaX : 0;
    },
    deltaY: function (a) {
      return "deltaY" in a ? a.deltaY : "wheelDeltaY" in a ? -a.wheelDeltaY : "wheelDelta" in a ? -a.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }),
  Zd = rd(Yd),
  $d = [9, 13, 27, 32],
  ae = ia && "CompositionEvent" in window,
  be = null;
ia && "documentMode" in document && (be = document.documentMode);
var ce = ia && "TextEvent" in window && !be,
  de = ia && (!ae || be && 8 < be && 11 >= be),
  ee = String.fromCharCode(32),
  fe = !1;
function ge(a, b) {
  switch (a) {
    case "keyup":
      return -1 !== $d.indexOf(b.keyCode);
    case "keydown":
      return 229 !== b.keyCode;
    case "keypress":
    case "mousedown":
    case "focusout":
      return !0;
    default:
      return !1;
  }
}
function he(a) {
  a = a.detail;
  return "object" === typeof a && "data" in a ? a.data : null;
}
var ie = !1;
function je(a, b) {
  switch (a) {
    case "compositionend":
      return he(b);
    case "keypress":
      if (32 !== b.which) return null;
      fe = !0;
      return ee;
    case "textInput":
      return a = b.data, a === ee && fe ? null : a;
    default:
      return null;
  }
}
function ke(a, b) {
  if (ie) return "compositionend" === a || !ae && ge(a, b) ? (a = nd(), md = ld = kd = null, ie = !1, a) : null;
  switch (a) {
    case "paste":
      return null;
    case "keypress":
      if (!(b.ctrlKey || b.altKey || b.metaKey) || b.ctrlKey && b.altKey) {
        if (b.char && 1 < b.char.length) return b.char;
        if (b.which) return String.fromCharCode(b.which);
      }
      return null;
    case "compositionend":
      return de && "ko" !== b.locale ? null : b.data;
    default:
      return null;
  }
}
var le = {
  color: !0,
  date: !0,
  datetime: !0,
  "datetime-local": !0,
  email: !0,
  month: !0,
  number: !0,
  password: !0,
  range: !0,
  search: !0,
  tel: !0,
  text: !0,
  time: !0,
  url: !0,
  week: !0
};
function me(a) {
  var b = a && a.nodeName && a.nodeName.toLowerCase();
  return "input" === b ? !!le[a.type] : "textarea" === b ? !0 : !1;
}
function ne(a, b, c, d) {
  Eb(d);
  b = oe(b, "onChange");
  0 < b.length && (c = new td("onChange", "change", null, c, d), a.push({
    event: c,
    listeners: b
  }));
}
var pe = null,
  qe = null;
function re(a) {
  se(a, 0);
}
function te(a) {
  var b = ue(a);
  if (Wa(b)) return a;
}
function ve(a, b) {
  if ("change" === a) return b;
}
var we = !1;
if (ia) {
  var xe;
  if (ia) {
    var ye = ("oninput" in document);
    if (!ye) {
      var ze = document.createElement("div");
      ze.setAttribute("oninput", "return;");
      ye = "function" === typeof ze.oninput;
    }
    xe = ye;
  } else xe = !1;
  we = xe && (!document.documentMode || 9 < document.documentMode);
}
function Ae() {
  pe && (pe.detachEvent("onpropertychange", Be), qe = pe = null);
}
function Be(a) {
  if ("value" === a.propertyName && te(qe)) {
    var b = [];
    ne(b, qe, a, xb(a));
    Jb(re, b);
  }
}
function Ce(a, b, c) {
  "focusin" === a ? (Ae(), pe = b, qe = c, pe.attachEvent("onpropertychange", Be)) : "focusout" === a && Ae();
}
function De(a) {
  if ("selectionchange" === a || "keyup" === a || "keydown" === a) return te(qe);
}
function Ee(a, b) {
  if ("click" === a) return te(b);
}
function Fe(a, b) {
  if ("input" === a || "change" === a) return te(b);
}
function Ge(a, b) {
  return a === b && (0 !== a || 1 / a === 1 / b) || a !== a && b !== b;
}
var He = "function" === typeof Object.is ? Object.is : Ge;
function Ie(a, b) {
  if (He(a, b)) return !0;
  if ("object" !== typeof a || null === a || "object" !== typeof b || null === b) return !1;
  var c = Object.keys(a),
    d = Object.keys(b);
  if (c.length !== d.length) return !1;
  for (d = 0; d < c.length; d++) {
    var e = c[d];
    if (!ja.call(b, e) || !He(a[e], b[e])) return !1;
  }
  return !0;
}
function Je(a) {
  for (; a && a.firstChild;) a = a.firstChild;
  return a;
}
function Ke(a, b) {
  var c = Je(a);
  a = 0;
  for (var d; c;) {
    if (3 === c.nodeType) {
      d = a + c.textContent.length;
      if (a <= b && d >= b) return {
        node: c,
        offset: b - a
      };
      a = d;
    }
    a: {
      for (; c;) {
        if (c.nextSibling) {
          c = c.nextSibling;
          break a;
        }
        c = c.parentNode;
      }
      c = void 0;
    }
    c = Je(c);
  }
}
function Le(a, b) {
  return a && b ? a === b ? !0 : a && 3 === a.nodeType ? !1 : b && 3 === b.nodeType ? Le(a, b.parentNode) : "contains" in a ? a.contains(b) : a.compareDocumentPosition ? !!(a.compareDocumentPosition(b) & 16) : !1 : !1;
}
function Me() {
  for (var a = window, b = Xa(); b instanceof a.HTMLIFrameElement;) {
    try {
      var c = "string" === typeof b.contentWindow.location.href;
    } catch (d) {
      c = !1;
    }
    if (c) a = b.contentWindow;else break;
    b = Xa(a.document);
  }
  return b;
}
function Ne(a) {
  var b = a && a.nodeName && a.nodeName.toLowerCase();
  return b && ("input" === b && ("text" === a.type || "search" === a.type || "tel" === a.type || "url" === a.type || "password" === a.type) || "textarea" === b || "true" === a.contentEditable);
}
function Oe(a) {
  var b = Me(),
    c = a.focusedElem,
    d = a.selectionRange;
  if (b !== c && c && c.ownerDocument && Le(c.ownerDocument.documentElement, c)) {
    if (null !== d && Ne(c)) if (b = d.start, a = d.end, void 0 === a && (a = b), "selectionStart" in c) c.selectionStart = b, c.selectionEnd = Math.min(a, c.value.length);else if (a = (b = c.ownerDocument || document) && b.defaultView || window, a.getSelection) {
      a = a.getSelection();
      var e = c.textContent.length,
        f = Math.min(d.start, e);
      d = void 0 === d.end ? f : Math.min(d.end, e);
      !a.extend && f > d && (e = d, d = f, f = e);
      e = Ke(c, f);
      var g = Ke(c, d);
      e && g && (1 !== a.rangeCount || a.anchorNode !== e.node || a.anchorOffset !== e.offset || a.focusNode !== g.node || a.focusOffset !== g.offset) && (b = b.createRange(), b.setStart(e.node, e.offset), a.removeAllRanges(), f > d ? (a.addRange(b), a.extend(g.node, g.offset)) : (b.setEnd(g.node, g.offset), a.addRange(b)));
    }
    b = [];
    for (a = c; a = a.parentNode;) 1 === a.nodeType && b.push({
      element: a,
      left: a.scrollLeft,
      top: a.scrollTop
    });
    "function" === typeof c.focus && c.focus();
    for (c = 0; c < b.length; c++) a = b[c], a.element.scrollLeft = a.left, a.element.scrollTop = a.top;
  }
}
var Pe = ia && "documentMode" in document && 11 >= document.documentMode,
  Qe = null,
  Re = null,
  Se = null,
  Te = !1;
function Ue(a, b, c) {
  var d = c.window === c ? c.document : 9 === c.nodeType ? c : c.ownerDocument;
  Te || null == Qe || Qe !== Xa(d) || (d = Qe, "selectionStart" in d && Ne(d) ? d = {
    start: d.selectionStart,
    end: d.selectionEnd
  } : (d = (d.ownerDocument && d.ownerDocument.defaultView || window).getSelection(), d = {
    anchorNode: d.anchorNode,
    anchorOffset: d.anchorOffset,
    focusNode: d.focusNode,
    focusOffset: d.focusOffset
  }), Se && Ie(Se, d) || (Se = d, d = oe(Re, "onSelect"), 0 < d.length && (b = new td("onSelect", "select", null, b, c), a.push({
    event: b,
    listeners: d
  }), b.target = Qe)));
}
function Ve(a, b) {
  var c = {};
  c[a.toLowerCase()] = b.toLowerCase();
  c["Webkit" + a] = "webkit" + b;
  c["Moz" + a] = "moz" + b;
  return c;
}
var We = {
    animationend: Ve("Animation", "AnimationEnd"),
    animationiteration: Ve("Animation", "AnimationIteration"),
    animationstart: Ve("Animation", "AnimationStart"),
    transitionend: Ve("Transition", "TransitionEnd")
  },
  Xe = {},
  Ye = {};
ia && (Ye = document.createElement("div").style, "AnimationEvent" in window || (delete We.animationend.animation, delete We.animationiteration.animation, delete We.animationstart.animation), "TransitionEvent" in window || delete We.transitionend.transition);
function Ze(a) {
  if (Xe[a]) return Xe[a];
  if (!We[a]) return a;
  var b = We[a],
    c;
  for (c in b) if (b.hasOwnProperty(c) && c in Ye) return Xe[a] = b[c];
  return a;
}
var $e = Ze("animationend"),
  af = Ze("animationiteration"),
  bf = Ze("animationstart"),
  cf = Ze("transitionend"),
  df = new Map(),
  ef = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
function ff(a, b) {
  df.set(a, b);
  fa(b, [a]);
}
for (var gf = 0; gf < ef.length; gf++) {
  var hf = ef[gf],
    jf = hf.toLowerCase(),
    kf = hf[0].toUpperCase() + hf.slice(1);
  ff(jf, "on" + kf);
}
ff($e, "onAnimationEnd");
ff(af, "onAnimationIteration");
ff(bf, "onAnimationStart");
ff("dblclick", "onDoubleClick");
ff("focusin", "onFocus");
ff("focusout", "onBlur");
ff(cf, "onTransitionEnd");
ha("onMouseEnter", ["mouseout", "mouseover"]);
ha("onMouseLeave", ["mouseout", "mouseover"]);
ha("onPointerEnter", ["pointerout", "pointerover"]);
ha("onPointerLeave", ["pointerout", "pointerover"]);
fa("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
fa("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
fa("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
fa("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
fa("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
fa("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
var lf = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),
  mf = new Set("cancel close invalid load scroll toggle".split(" ").concat(lf));
function nf(a, b, c) {
  var d = a.type || "unknown-event";
  a.currentTarget = c;
  Ub(d, b, void 0, a);
  a.currentTarget = null;
}
function se(a, b) {
  b = 0 !== (b & 4);
  for (var c = 0; c < a.length; c++) {
    var d = a[c],
      e = d.event;
    d = d.listeners;
    a: {
      var f = void 0;
      if (b) for (var g = d.length - 1; 0 <= g; g--) {
        var h = d[g],
          k = h.instance,
          l = h.currentTarget;
        h = h.listener;
        if (k !== f && e.isPropagationStopped()) break a;
        nf(e, h, l);
        f = k;
      } else for (g = 0; g < d.length; g++) {
        h = d[g];
        k = h.instance;
        l = h.currentTarget;
        h = h.listener;
        if (k !== f && e.isPropagationStopped()) break a;
        nf(e, h, l);
        f = k;
      }
    }
  }
  if (Qb) throw a = Rb, Qb = !1, Rb = null, a;
}
function D(a, b) {
  var c = b[of];
  void 0 === c && (c = b[of] = new Set());
  var d = a + "__bubble";
  c.has(d) || (pf(b, a, 2, !1), c.add(d));
}
function qf(a, b, c) {
  var d = 0;
  b && (d |= 4);
  pf(c, a, d, b);
}
var rf = "_reactListening" + Math.random().toString(36).slice(2);
function sf(a) {
  if (!a[rf]) {
    a[rf] = !0;
    da.forEach(function (b) {
      "selectionchange" !== b && (mf.has(b) || qf(b, !1, a), qf(b, !0, a));
    });
    var b = 9 === a.nodeType ? a : a.ownerDocument;
    null === b || b[rf] || (b[rf] = !0, qf("selectionchange", !1, b));
  }
}
function pf(a, b, c, d) {
  switch (jd(b)) {
    case 1:
      var e = ed;
      break;
    case 4:
      e = gd;
      break;
    default:
      e = fd;
  }
  c = e.bind(null, b, c, a);
  e = void 0;
  !Lb || "touchstart" !== b && "touchmove" !== b && "wheel" !== b || (e = !0);
  d ? void 0 !== e ? a.addEventListener(b, c, {
    capture: !0,
    passive: e
  }) : a.addEventListener(b, c, !0) : void 0 !== e ? a.addEventListener(b, c, {
    passive: e
  }) : a.addEventListener(b, c, !1);
}
function hd(a, b, c, d, e) {
  var f = d;
  if (0 === (b & 1) && 0 === (b & 2) && null !== d) a: for (;;) {
    if (null === d) return;
    var g = d.tag;
    if (3 === g || 4 === g) {
      var h = d.stateNode.containerInfo;
      if (h === e || 8 === h.nodeType && h.parentNode === e) break;
      if (4 === g) for (g = d.return; null !== g;) {
        var k = g.tag;
        if (3 === k || 4 === k) if (k = g.stateNode.containerInfo, k === e || 8 === k.nodeType && k.parentNode === e) return;
        g = g.return;
      }
      for (; null !== h;) {
        g = Wc(h);
        if (null === g) return;
        k = g.tag;
        if (5 === k || 6 === k) {
          d = f = g;
          continue a;
        }
        h = h.parentNode;
      }
    }
    d = d.return;
  }
  Jb(function () {
    var d = f,
      e = xb(c),
      g = [];
    a: {
      var h = df.get(a);
      if (void 0 !== h) {
        var k = td,
          n = a;
        switch (a) {
          case "keypress":
            if (0 === od(c)) break a;
          case "keydown":
          case "keyup":
            k = Rd;
            break;
          case "focusin":
            n = "focus";
            k = Fd;
            break;
          case "focusout":
            n = "blur";
            k = Fd;
            break;
          case "beforeblur":
          case "afterblur":
            k = Fd;
            break;
          case "click":
            if (2 === c.button) break a;
          case "auxclick":
          case "dblclick":
          case "mousedown":
          case "mousemove":
          case "mouseup":
          case "mouseout":
          case "mouseover":
          case "contextmenu":
            k = Bd;
            break;
          case "drag":
          case "dragend":
          case "dragenter":
          case "dragexit":
          case "dragleave":
          case "dragover":
          case "dragstart":
          case "drop":
            k = Dd;
            break;
          case "touchcancel":
          case "touchend":
          case "touchmove":
          case "touchstart":
            k = Vd;
            break;
          case $e:
          case af:
          case bf:
            k = Hd;
            break;
          case cf:
            k = Xd;
            break;
          case "scroll":
            k = vd;
            break;
          case "wheel":
            k = Zd;
            break;
          case "copy":
          case "cut":
          case "paste":
            k = Jd;
            break;
          case "gotpointercapture":
          case "lostpointercapture":
          case "pointercancel":
          case "pointerdown":
          case "pointermove":
          case "pointerout":
          case "pointerover":
          case "pointerup":
            k = Td;
        }
        var t = 0 !== (b & 4),
          J = !t && "scroll" === a,
          x = t ? null !== h ? h + "Capture" : null : h;
        t = [];
        for (var w = d, u; null !== w;) {
          u = w;
          var F = u.stateNode;
          5 === u.tag && null !== F && (u = F, null !== x && (F = Kb(w, x), null != F && t.push(tf(w, F, u))));
          if (J) break;
          w = w.return;
        }
        0 < t.length && (h = new k(h, n, null, c, e), g.push({
          event: h,
          listeners: t
        }));
      }
    }
    if (0 === (b & 7)) {
      a: {
        h = "mouseover" === a || "pointerover" === a;
        k = "mouseout" === a || "pointerout" === a;
        if (h && c !== wb && (n = c.relatedTarget || c.fromElement) && (Wc(n) || n[uf])) break a;
        if (k || h) {
          h = e.window === e ? e : (h = e.ownerDocument) ? h.defaultView || h.parentWindow : window;
          if (k) {
            if (n = c.relatedTarget || c.toElement, k = d, n = n ? Wc(n) : null, null !== n && (J = Vb(n), n !== J || 5 !== n.tag && 6 !== n.tag)) n = null;
          } else k = null, n = d;
          if (k !== n) {
            t = Bd;
            F = "onMouseLeave";
            x = "onMouseEnter";
            w = "mouse";
            if ("pointerout" === a || "pointerover" === a) t = Td, F = "onPointerLeave", x = "onPointerEnter", w = "pointer";
            J = null == k ? h : ue(k);
            u = null == n ? h : ue(n);
            h = new t(F, w + "leave", k, c, e);
            h.target = J;
            h.relatedTarget = u;
            F = null;
            Wc(e) === d && (t = new t(x, w + "enter", n, c, e), t.target = u, t.relatedTarget = J, F = t);
            J = F;
            if (k && n) b: {
              t = k;
              x = n;
              w = 0;
              for (u = t; u; u = vf(u)) w++;
              u = 0;
              for (F = x; F; F = vf(F)) u++;
              for (; 0 < w - u;) t = vf(t), w--;
              for (; 0 < u - w;) x = vf(x), u--;
              for (; w--;) {
                if (t === x || null !== x && t === x.alternate) break b;
                t = vf(t);
                x = vf(x);
              }
              t = null;
            } else t = null;
            null !== k && wf(g, h, k, t, !1);
            null !== n && null !== J && wf(g, J, n, t, !0);
          }
        }
      }
      a: {
        h = d ? ue(d) : window;
        k = h.nodeName && h.nodeName.toLowerCase();
        if ("select" === k || "input" === k && "file" === h.type) var na = ve;else if (me(h)) {
          if (we) na = Fe;else {
            na = De;
            var xa = Ce;
          }
        } else (k = h.nodeName) && "input" === k.toLowerCase() && ("checkbox" === h.type || "radio" === h.type) && (na = Ee);
        if (na && (na = na(a, d))) {
          ne(g, na, c, e);
          break a;
        }
        xa && xa(a, h, d);
        "focusout" === a && (xa = h._wrapperState) && xa.controlled && "number" === h.type && cb(h, "number", h.value);
      }
      xa = d ? ue(d) : window;
      switch (a) {
        case "focusin":
          if (me(xa) || "true" === xa.contentEditable) Qe = xa, Re = d, Se = null;
          break;
        case "focusout":
          Se = Re = Qe = null;
          break;
        case "mousedown":
          Te = !0;
          break;
        case "contextmenu":
        case "mouseup":
        case "dragend":
          Te = !1;
          Ue(g, c, e);
          break;
        case "selectionchange":
          if (Pe) break;
        case "keydown":
        case "keyup":
          Ue(g, c, e);
      }
      var $a;
      if (ae) b: {
        switch (a) {
          case "compositionstart":
            var ba = "onCompositionStart";
            break b;
          case "compositionend":
            ba = "onCompositionEnd";
            break b;
          case "compositionupdate":
            ba = "onCompositionUpdate";
            break b;
        }
        ba = void 0;
      } else ie ? ge(a, c) && (ba = "onCompositionEnd") : "keydown" === a && 229 === c.keyCode && (ba = "onCompositionStart");
      ba && (de && "ko" !== c.locale && (ie || "onCompositionStart" !== ba ? "onCompositionEnd" === ba && ie && ($a = nd()) : (kd = e, ld = "value" in kd ? kd.value : kd.textContent, ie = !0)), xa = oe(d, ba), 0 < xa.length && (ba = new Ld(ba, a, null, c, e), g.push({
        event: ba,
        listeners: xa
      }), $a ? ba.data = $a : ($a = he(c), null !== $a && (ba.data = $a))));
      if ($a = ce ? je(a, c) : ke(a, c)) d = oe(d, "onBeforeInput"), 0 < d.length && (e = new Ld("onBeforeInput", "beforeinput", null, c, e), g.push({
        event: e,
        listeners: d
      }), e.data = $a);
    }
    se(g, b);
  });
}
function tf(a, b, c) {
  return {
    instance: a,
    listener: b,
    currentTarget: c
  };
}
function oe(a, b) {
  for (var c = b + "Capture", d = []; null !== a;) {
    var e = a,
      f = e.stateNode;
    5 === e.tag && null !== f && (e = f, f = Kb(a, c), null != f && d.unshift(tf(a, f, e)), f = Kb(a, b), null != f && d.push(tf(a, f, e)));
    a = a.return;
  }
  return d;
}
function vf(a) {
  if (null === a) return null;
  do a = a.return; while (a && 5 !== a.tag);
  return a ? a : null;
}
function wf(a, b, c, d, e) {
  for (var f = b._reactName, g = []; null !== c && c !== d;) {
    var h = c,
      k = h.alternate,
      l = h.stateNode;
    if (null !== k && k === d) break;
    5 === h.tag && null !== l && (h = l, e ? (k = Kb(c, f), null != k && g.unshift(tf(c, k, h))) : e || (k = Kb(c, f), null != k && g.push(tf(c, k, h))));
    c = c.return;
  }
  0 !== g.length && a.push({
    event: b,
    listeners: g
  });
}
var xf = /\r\n?/g,
  yf = /\u0000|\uFFFD/g;
function zf(a) {
  return ("string" === typeof a ? a : "" + a).replace(xf, "\n").replace(yf, "");
}
function Af(a, b, c) {
  b = zf(b);
  if (zf(a) !== b && c) throw Error(p(425));
}
function Bf() {}
var Cf = null,
  Df = null;
function Ef(a, b) {
  return "textarea" === a || "noscript" === a || "string" === typeof b.children || "number" === typeof b.children || "object" === typeof b.dangerouslySetInnerHTML && null !== b.dangerouslySetInnerHTML && null != b.dangerouslySetInnerHTML.__html;
}
var Ff = "function" === typeof setTimeout ? setTimeout : void 0,
  Gf = "function" === typeof clearTimeout ? clearTimeout : void 0,
  Hf = "function" === typeof Promise ? Promise : void 0,
  Jf = "function" === typeof queueMicrotask ? queueMicrotask : "undefined" !== typeof Hf ? function (a) {
    return Hf.resolve(null).then(a).catch(If);
  } : Ff;
function If(a) {
  setTimeout(function () {
    throw a;
  });
}
function Kf(a, b) {
  var c = b,
    d = 0;
  do {
    var e = c.nextSibling;
    a.removeChild(c);
    if (e && 8 === e.nodeType) if (c = e.data, "/$" === c) {
      if (0 === d) {
        a.removeChild(e);
        bd(b);
        return;
      }
      d--;
    } else "$" !== c && "$?" !== c && "$!" !== c || d++;
    c = e;
  } while (c);
  bd(b);
}
function Lf(a) {
  for (; null != a; a = a.nextSibling) {
    var b = a.nodeType;
    if (1 === b || 3 === b) break;
    if (8 === b) {
      b = a.data;
      if ("$" === b || "$!" === b || "$?" === b) break;
      if ("/$" === b) return null;
    }
  }
  return a;
}
function Mf(a) {
  a = a.previousSibling;
  for (var b = 0; a;) {
    if (8 === a.nodeType) {
      var c = a.data;
      if ("$" === c || "$!" === c || "$?" === c) {
        if (0 === b) return a;
        b--;
      } else "/$" === c && b++;
    }
    a = a.previousSibling;
  }
  return null;
}
var Nf = Math.random().toString(36).slice(2),
  Of = "__reactFiber$" + Nf,
  Pf = "__reactProps$" + Nf,
  uf = "__reactContainer$" + Nf,
  of = "__reactEvents$" + Nf,
  Qf = "__reactListeners$" + Nf,
  Rf = "__reactHandles$" + Nf;
function Wc(a) {
  var b = a[Of];
  if (b) return b;
  for (var c = a.parentNode; c;) {
    if (b = c[uf] || c[Of]) {
      c = b.alternate;
      if (null !== b.child || null !== c && null !== c.child) for (a = Mf(a); null !== a;) {
        if (c = a[Of]) return c;
        a = Mf(a);
      }
      return b;
    }
    a = c;
    c = a.parentNode;
  }
  return null;
}
function Cb(a) {
  a = a[Of] || a[uf];
  return !a || 5 !== a.tag && 6 !== a.tag && 13 !== a.tag && 3 !== a.tag ? null : a;
}
function ue(a) {
  if (5 === a.tag || 6 === a.tag) return a.stateNode;
  throw Error(p(33));
}
function Db(a) {
  return a[Pf] || null;
}
var Sf = [],
  Tf = -1;
function Uf(a) {
  return {
    current: a
  };
}
function E(a) {
  0 > Tf || (a.current = Sf[Tf], Sf[Tf] = null, Tf--);
}
function G(a, b) {
  Tf++;
  Sf[Tf] = a.current;
  a.current = b;
}
var Vf = {},
  H = Uf(Vf),
  Wf = Uf(!1),
  Xf = Vf;
function Yf(a, b) {
  var c = a.type.contextTypes;
  if (!c) return Vf;
  var d = a.stateNode;
  if (d && d.__reactInternalMemoizedUnmaskedChildContext === b) return d.__reactInternalMemoizedMaskedChildContext;
  var e = {},
    f;
  for (f in c) e[f] = b[f];
  d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = b, a.__reactInternalMemoizedMaskedChildContext = e);
  return e;
}
function Zf(a) {
  a = a.childContextTypes;
  return null !== a && void 0 !== a;
}
function $f() {
  E(Wf);
  E(H);
}
function ag(a, b, c) {
  if (H.current !== Vf) throw Error(p(168));
  G(H, b);
  G(Wf, c);
}
function bg(a, b, c) {
  var d = a.stateNode;
  b = b.childContextTypes;
  if ("function" !== typeof d.getChildContext) return c;
  d = d.getChildContext();
  for (var e in d) if (!(e in b)) throw Error(p(108, Ra(a) || "Unknown", e));
  return A({}, c, d);
}
function cg(a) {
  a = (a = a.stateNode) && a.__reactInternalMemoizedMergedChildContext || Vf;
  Xf = H.current;
  G(H, a);
  G(Wf, Wf.current);
  return !0;
}
function dg(a, b, c) {
  var d = a.stateNode;
  if (!d) throw Error(p(169));
  c ? (a = bg(a, b, Xf), d.__reactInternalMemoizedMergedChildContext = a, E(Wf), E(H), G(H, a)) : E(Wf);
  G(Wf, c);
}
var eg = null,
  fg = !1,
  gg = !1;
function hg(a) {
  null === eg ? eg = [a] : eg.push(a);
}
function ig(a) {
  fg = !0;
  hg(a);
}
function jg() {
  if (!gg && null !== eg) {
    gg = !0;
    var a = 0,
      b = C;
    try {
      var c = eg;
      for (C = 1; a < c.length; a++) {
        var d = c[a];
        do d = d(!0); while (null !== d);
      }
      eg = null;
      fg = !1;
    } catch (e) {
      throw null !== eg && (eg = eg.slice(a + 1)), ac(fc, jg), e;
    } finally {
      C = b, gg = !1;
    }
  }
  return null;
}
var kg = [],
  lg = 0,
  mg = null,
  ng = 0,
  og = [],
  pg = 0,
  qg = null,
  rg = 1,
  sg = "";
function tg(a, b) {
  kg[lg++] = ng;
  kg[lg++] = mg;
  mg = a;
  ng = b;
}
function ug(a, b, c) {
  og[pg++] = rg;
  og[pg++] = sg;
  og[pg++] = qg;
  qg = a;
  var d = rg;
  a = sg;
  var e = 32 - oc(d) - 1;
  d &= ~(1 << e);
  c += 1;
  var f = 32 - oc(b) + e;
  if (30 < f) {
    var g = e - e % 5;
    f = (d & (1 << g) - 1).toString(32);
    d >>= g;
    e -= g;
    rg = 1 << 32 - oc(b) + e | c << e | d;
    sg = f + a;
  } else rg = 1 << f | c << e | d, sg = a;
}
function vg(a) {
  null !== a.return && (tg(a, 1), ug(a, 1, 0));
}
function wg(a) {
  for (; a === mg;) mg = kg[--lg], kg[lg] = null, ng = kg[--lg], kg[lg] = null;
  for (; a === qg;) qg = og[--pg], og[pg] = null, sg = og[--pg], og[pg] = null, rg = og[--pg], og[pg] = null;
}
var xg = null,
  yg = null,
  I = !1,
  zg = null;
function Ag(a, b) {
  var c = Bg(5, null, null, 0);
  c.elementType = "DELETED";
  c.stateNode = b;
  c.return = a;
  b = a.deletions;
  null === b ? (a.deletions = [c], a.flags |= 16) : b.push(c);
}
function Cg(a, b) {
  switch (a.tag) {
    case 5:
      var c = a.type;
      b = 1 !== b.nodeType || c.toLowerCase() !== b.nodeName.toLowerCase() ? null : b;
      return null !== b ? (a.stateNode = b, xg = a, yg = Lf(b.firstChild), !0) : !1;
    case 6:
      return b = "" === a.pendingProps || 3 !== b.nodeType ? null : b, null !== b ? (a.stateNode = b, xg = a, yg = null, !0) : !1;
    case 13:
      return b = 8 !== b.nodeType ? null : b, null !== b ? (c = null !== qg ? {
        id: rg,
        overflow: sg
      } : null, a.memoizedState = {
        dehydrated: b,
        treeContext: c,
        retryLane: 1073741824
      }, c = Bg(18, null, null, 0), c.stateNode = b, c.return = a, a.child = c, xg = a, yg = null, !0) : !1;
    default:
      return !1;
  }
}
function Dg(a) {
  return 0 !== (a.mode & 1) && 0 === (a.flags & 128);
}
function Eg(a) {
  if (I) {
    var b = yg;
    if (b) {
      var c = b;
      if (!Cg(a, b)) {
        if (Dg(a)) throw Error(p(418));
        b = Lf(c.nextSibling);
        var d = xg;
        b && Cg(a, b) ? Ag(d, c) : (a.flags = a.flags & -4097 | 2, I = !1, xg = a);
      }
    } else {
      if (Dg(a)) throw Error(p(418));
      a.flags = a.flags & -4097 | 2;
      I = !1;
      xg = a;
    }
  }
}
function Fg(a) {
  for (a = a.return; null !== a && 5 !== a.tag && 3 !== a.tag && 13 !== a.tag;) a = a.return;
  xg = a;
}
function Gg(a) {
  if (a !== xg) return !1;
  if (!I) return Fg(a), I = !0, !1;
  var b;
  (b = 3 !== a.tag) && !(b = 5 !== a.tag) && (b = a.type, b = "head" !== b && "body" !== b && !Ef(a.type, a.memoizedProps));
  if (b && (b = yg)) {
    if (Dg(a)) throw Hg(), Error(p(418));
    for (; b;) Ag(a, b), b = Lf(b.nextSibling);
  }
  Fg(a);
  if (13 === a.tag) {
    a = a.memoizedState;
    a = null !== a ? a.dehydrated : null;
    if (!a) throw Error(p(317));
    a: {
      a = a.nextSibling;
      for (b = 0; a;) {
        if (8 === a.nodeType) {
          var c = a.data;
          if ("/$" === c) {
            if (0 === b) {
              yg = Lf(a.nextSibling);
              break a;
            }
            b--;
          } else "$" !== c && "$!" !== c && "$?" !== c || b++;
        }
        a = a.nextSibling;
      }
      yg = null;
    }
  } else yg = xg ? Lf(a.stateNode.nextSibling) : null;
  return !0;
}
function Hg() {
  for (var a = yg; a;) a = Lf(a.nextSibling);
}
function Ig() {
  yg = xg = null;
  I = !1;
}
function Jg(a) {
  null === zg ? zg = [a] : zg.push(a);
}
var Kg = ua.ReactCurrentBatchConfig;
function Lg(a, b, c) {
  a = c.ref;
  if (null !== a && "function" !== typeof a && "object" !== typeof a) {
    if (c._owner) {
      c = c._owner;
      if (c) {
        if (1 !== c.tag) throw Error(p(309));
        var d = c.stateNode;
      }
      if (!d) throw Error(p(147, a));
      var e = d,
        f = "" + a;
      if (null !== b && null !== b.ref && "function" === typeof b.ref && b.ref._stringRef === f) return b.ref;
      b = function (a) {
        var b = e.refs;
        null === a ? delete b[f] : b[f] = a;
      };
      b._stringRef = f;
      return b;
    }
    if ("string" !== typeof a) throw Error(p(284));
    if (!c._owner) throw Error(p(290, a));
  }
  return a;
}
function Mg(a, b) {
  a = Object.prototype.toString.call(b);
  throw Error(p(31, "[object Object]" === a ? "object with keys {" + Object.keys(b).join(", ") + "}" : a));
}
function Ng(a) {
  var b = a._init;
  return b(a._payload);
}
function Og(a) {
  function b(b, c) {
    if (a) {
      var d = b.deletions;
      null === d ? (b.deletions = [c], b.flags |= 16) : d.push(c);
    }
  }
  function c(c, d) {
    if (!a) return null;
    for (; null !== d;) b(c, d), d = d.sibling;
    return null;
  }
  function d(a, b) {
    for (a = new Map(); null !== b;) null !== b.key ? a.set(b.key, b) : a.set(b.index, b), b = b.sibling;
    return a;
  }
  function e(a, b) {
    a = Pg(a, b);
    a.index = 0;
    a.sibling = null;
    return a;
  }
  function f(b, c, d) {
    b.index = d;
    if (!a) return b.flags |= 1048576, c;
    d = b.alternate;
    if (null !== d) return d = d.index, d < c ? (b.flags |= 2, c) : d;
    b.flags |= 2;
    return c;
  }
  function g(b) {
    a && null === b.alternate && (b.flags |= 2);
    return b;
  }
  function h(a, b, c, d) {
    if (null === b || 6 !== b.tag) return b = Qg(c, a.mode, d), b.return = a, b;
    b = e(b, c);
    b.return = a;
    return b;
  }
  function k(a, b, c, d) {
    var f = c.type;
    if (f === ya) return m(a, b, c.props.children, d, c.key);
    if (null !== b && (b.elementType === f || "object" === typeof f && null !== f && f.$$typeof === Ha && Ng(f) === b.type)) return d = e(b, c.props), d.ref = Lg(a, b, c), d.return = a, d;
    d = Rg(c.type, c.key, c.props, null, a.mode, d);
    d.ref = Lg(a, b, c);
    d.return = a;
    return d;
  }
  function l(a, b, c, d) {
    if (null === b || 4 !== b.tag || b.stateNode.containerInfo !== c.containerInfo || b.stateNode.implementation !== c.implementation) return b = Sg(c, a.mode, d), b.return = a, b;
    b = e(b, c.children || []);
    b.return = a;
    return b;
  }
  function m(a, b, c, d, f) {
    if (null === b || 7 !== b.tag) return b = Tg(c, a.mode, d, f), b.return = a, b;
    b = e(b, c);
    b.return = a;
    return b;
  }
  function q(a, b, c) {
    if ("string" === typeof b && "" !== b || "number" === typeof b) return b = Qg("" + b, a.mode, c), b.return = a, b;
    if ("object" === typeof b && null !== b) {
      switch (b.$$typeof) {
        case va:
          return c = Rg(b.type, b.key, b.props, null, a.mode, c), c.ref = Lg(a, null, b), c.return = a, c;
        case wa:
          return b = Sg(b, a.mode, c), b.return = a, b;
        case Ha:
          var d = b._init;
          return q(a, d(b._payload), c);
      }
      if (eb(b) || Ka(b)) return b = Tg(b, a.mode, c, null), b.return = a, b;
      Mg(a, b);
    }
    return null;
  }
  function r(a, b, c, d) {
    var e = null !== b ? b.key : null;
    if ("string" === typeof c && "" !== c || "number" === typeof c) return null !== e ? null : h(a, b, "" + c, d);
    if ("object" === typeof c && null !== c) {
      switch (c.$$typeof) {
        case va:
          return c.key === e ? k(a, b, c, d) : null;
        case wa:
          return c.key === e ? l(a, b, c, d) : null;
        case Ha:
          return e = c._init, r(a, b, e(c._payload), d);
      }
      if (eb(c) || Ka(c)) return null !== e ? null : m(a, b, c, d, null);
      Mg(a, c);
    }
    return null;
  }
  function y(a, b, c, d, e) {
    if ("string" === typeof d && "" !== d || "number" === typeof d) return a = a.get(c) || null, h(b, a, "" + d, e);
    if ("object" === typeof d && null !== d) {
      switch (d.$$typeof) {
        case va:
          return a = a.get(null === d.key ? c : d.key) || null, k(b, a, d, e);
        case wa:
          return a = a.get(null === d.key ? c : d.key) || null, l(b, a, d, e);
        case Ha:
          var f = d._init;
          return y(a, b, c, f(d._payload), e);
      }
      if (eb(d) || Ka(d)) return a = a.get(c) || null, m(b, a, d, e, null);
      Mg(b, d);
    }
    return null;
  }
  function n(e, g, h, k) {
    for (var l = null, m = null, u = g, w = g = 0, x = null; null !== u && w < h.length; w++) {
      u.index > w ? (x = u, u = null) : x = u.sibling;
      var n = r(e, u, h[w], k);
      if (null === n) {
        null === u && (u = x);
        break;
      }
      a && u && null === n.alternate && b(e, u);
      g = f(n, g, w);
      null === m ? l = n : m.sibling = n;
      m = n;
      u = x;
    }
    if (w === h.length) return c(e, u), I && tg(e, w), l;
    if (null === u) {
      for (; w < h.length; w++) u = q(e, h[w], k), null !== u && (g = f(u, g, w), null === m ? l = u : m.sibling = u, m = u);
      I && tg(e, w);
      return l;
    }
    for (u = d(e, u); w < h.length; w++) x = y(u, e, w, h[w], k), null !== x && (a && null !== x.alternate && u.delete(null === x.key ? w : x.key), g = f(x, g, w), null === m ? l = x : m.sibling = x, m = x);
    a && u.forEach(function (a) {
      return b(e, a);
    });
    I && tg(e, w);
    return l;
  }
  function t(e, g, h, k) {
    var l = Ka(h);
    if ("function" !== typeof l) throw Error(p(150));
    h = l.call(h);
    if (null == h) throw Error(p(151));
    for (var u = l = null, m = g, w = g = 0, x = null, n = h.next(); null !== m && !n.done; w++, n = h.next()) {
      m.index > w ? (x = m, m = null) : x = m.sibling;
      var t = r(e, m, n.value, k);
      if (null === t) {
        null === m && (m = x);
        break;
      }
      a && m && null === t.alternate && b(e, m);
      g = f(t, g, w);
      null === u ? l = t : u.sibling = t;
      u = t;
      m = x;
    }
    if (n.done) return c(e, m), I && tg(e, w), l;
    if (null === m) {
      for (; !n.done; w++, n = h.next()) n = q(e, n.value, k), null !== n && (g = f(n, g, w), null === u ? l = n : u.sibling = n, u = n);
      I && tg(e, w);
      return l;
    }
    for (m = d(e, m); !n.done; w++, n = h.next()) n = y(m, e, w, n.value, k), null !== n && (a && null !== n.alternate && m.delete(null === n.key ? w : n.key), g = f(n, g, w), null === u ? l = n : u.sibling = n, u = n);
    a && m.forEach(function (a) {
      return b(e, a);
    });
    I && tg(e, w);
    return l;
  }
  function J(a, d, f, h) {
    "object" === typeof f && null !== f && f.type === ya && null === f.key && (f = f.props.children);
    if ("object" === typeof f && null !== f) {
      switch (f.$$typeof) {
        case va:
          a: {
            for (var k = f.key, l = d; null !== l;) {
              if (l.key === k) {
                k = f.type;
                if (k === ya) {
                  if (7 === l.tag) {
                    c(a, l.sibling);
                    d = e(l, f.props.children);
                    d.return = a;
                    a = d;
                    break a;
                  }
                } else if (l.elementType === k || "object" === typeof k && null !== k && k.$$typeof === Ha && Ng(k) === l.type) {
                  c(a, l.sibling);
                  d = e(l, f.props);
                  d.ref = Lg(a, l, f);
                  d.return = a;
                  a = d;
                  break a;
                }
                c(a, l);
                break;
              } else b(a, l);
              l = l.sibling;
            }
            f.type === ya ? (d = Tg(f.props.children, a.mode, h, f.key), d.return = a, a = d) : (h = Rg(f.type, f.key, f.props, null, a.mode, h), h.ref = Lg(a, d, f), h.return = a, a = h);
          }
          return g(a);
        case wa:
          a: {
            for (l = f.key; null !== d;) {
              if (d.key === l) {
                if (4 === d.tag && d.stateNode.containerInfo === f.containerInfo && d.stateNode.implementation === f.implementation) {
                  c(a, d.sibling);
                  d = e(d, f.children || []);
                  d.return = a;
                  a = d;
                  break a;
                } else {
                  c(a, d);
                  break;
                }
              } else b(a, d);
              d = d.sibling;
            }
            d = Sg(f, a.mode, h);
            d.return = a;
            a = d;
          }
          return g(a);
        case Ha:
          return l = f._init, J(a, d, l(f._payload), h);
      }
      if (eb(f)) return n(a, d, f, h);
      if (Ka(f)) return t(a, d, f, h);
      Mg(a, f);
    }
    return "string" === typeof f && "" !== f || "number" === typeof f ? (f = "" + f, null !== d && 6 === d.tag ? (c(a, d.sibling), d = e(d, f), d.return = a, a = d) : (c(a, d), d = Qg(f, a.mode, h), d.return = a, a = d), g(a)) : c(a, d);
  }
  return J;
}
var Ug = Og(!0),
  Vg = Og(!1),
  Wg = Uf(null),
  Xg = null,
  Yg = null,
  Zg = null;
function $g() {
  Zg = Yg = Xg = null;
}
function ah(a) {
  var b = Wg.current;
  E(Wg);
  a._currentValue = b;
}
function bh(a, b, c) {
  for (; null !== a;) {
    var d = a.alternate;
    (a.childLanes & b) !== b ? (a.childLanes |= b, null !== d && (d.childLanes |= b)) : null !== d && (d.childLanes & b) !== b && (d.childLanes |= b);
    if (a === c) break;
    a = a.return;
  }
}
function ch(a, b) {
  Xg = a;
  Zg = Yg = null;
  a = a.dependencies;
  null !== a && null !== a.firstContext && (0 !== (a.lanes & b) && (dh = !0), a.firstContext = null);
}
function eh(a) {
  var b = a._currentValue;
  if (Zg !== a) if (a = {
    context: a,
    memoizedValue: b,
    next: null
  }, null === Yg) {
    if (null === Xg) throw Error(p(308));
    Yg = a;
    Xg.dependencies = {
      lanes: 0,
      firstContext: a
    };
  } else Yg = Yg.next = a;
  return b;
}
var fh = null;
function gh(a) {
  null === fh ? fh = [a] : fh.push(a);
}
function hh(a, b, c, d) {
  var e = b.interleaved;
  null === e ? (c.next = c, gh(b)) : (c.next = e.next, e.next = c);
  b.interleaved = c;
  return ih(a, d);
}
function ih(a, b) {
  a.lanes |= b;
  var c = a.alternate;
  null !== c && (c.lanes |= b);
  c = a;
  for (a = a.return; null !== a;) a.childLanes |= b, c = a.alternate, null !== c && (c.childLanes |= b), c = a, a = a.return;
  return 3 === c.tag ? c.stateNode : null;
}
var jh = !1;
function kh(a) {
  a.updateQueue = {
    baseState: a.memoizedState,
    firstBaseUpdate: null,
    lastBaseUpdate: null,
    shared: {
      pending: null,
      interleaved: null,
      lanes: 0
    },
    effects: null
  };
}
function lh(a, b) {
  a = a.updateQueue;
  b.updateQueue === a && (b.updateQueue = {
    baseState: a.baseState,
    firstBaseUpdate: a.firstBaseUpdate,
    lastBaseUpdate: a.lastBaseUpdate,
    shared: a.shared,
    effects: a.effects
  });
}
function mh(a, b) {
  return {
    eventTime: a,
    lane: b,
    tag: 0,
    payload: null,
    callback: null,
    next: null
  };
}
function nh(a, b, c) {
  var d = a.updateQueue;
  if (null === d) return null;
  d = d.shared;
  if (0 !== (K & 2)) {
    var e = d.pending;
    null === e ? b.next = b : (b.next = e.next, e.next = b);
    d.pending = b;
    return ih(a, c);
  }
  e = d.interleaved;
  null === e ? (b.next = b, gh(d)) : (b.next = e.next, e.next = b);
  d.interleaved = b;
  return ih(a, c);
}
function oh(a, b, c) {
  b = b.updateQueue;
  if (null !== b && (b = b.shared, 0 !== (c & 4194240))) {
    var d = b.lanes;
    d &= a.pendingLanes;
    c |= d;
    b.lanes = c;
    Cc(a, c);
  }
}
function ph(a, b) {
  var c = a.updateQueue,
    d = a.alternate;
  if (null !== d && (d = d.updateQueue, c === d)) {
    var e = null,
      f = null;
    c = c.firstBaseUpdate;
    if (null !== c) {
      do {
        var g = {
          eventTime: c.eventTime,
          lane: c.lane,
          tag: c.tag,
          payload: c.payload,
          callback: c.callback,
          next: null
        };
        null === f ? e = f = g : f = f.next = g;
        c = c.next;
      } while (null !== c);
      null === f ? e = f = b : f = f.next = b;
    } else e = f = b;
    c = {
      baseState: d.baseState,
      firstBaseUpdate: e,
      lastBaseUpdate: f,
      shared: d.shared,
      effects: d.effects
    };
    a.updateQueue = c;
    return;
  }
  a = c.lastBaseUpdate;
  null === a ? c.firstBaseUpdate = b : a.next = b;
  c.lastBaseUpdate = b;
}
function qh(a, b, c, d) {
  var e = a.updateQueue;
  jh = !1;
  var f = e.firstBaseUpdate,
    g = e.lastBaseUpdate,
    h = e.shared.pending;
  if (null !== h) {
    e.shared.pending = null;
    var k = h,
      l = k.next;
    k.next = null;
    null === g ? f = l : g.next = l;
    g = k;
    var m = a.alternate;
    null !== m && (m = m.updateQueue, h = m.lastBaseUpdate, h !== g && (null === h ? m.firstBaseUpdate = l : h.next = l, m.lastBaseUpdate = k));
  }
  if (null !== f) {
    var q = e.baseState;
    g = 0;
    m = l = k = null;
    h = f;
    do {
      var r = h.lane,
        y = h.eventTime;
      if ((d & r) === r) {
        null !== m && (m = m.next = {
          eventTime: y,
          lane: 0,
          tag: h.tag,
          payload: h.payload,
          callback: h.callback,
          next: null
        });
        a: {
          var n = a,
            t = h;
          r = b;
          y = c;
          switch (t.tag) {
            case 1:
              n = t.payload;
              if ("function" === typeof n) {
                q = n.call(y, q, r);
                break a;
              }
              q = n;
              break a;
            case 3:
              n.flags = n.flags & -65537 | 128;
            case 0:
              n = t.payload;
              r = "function" === typeof n ? n.call(y, q, r) : n;
              if (null === r || void 0 === r) break a;
              q = A({}, q, r);
              break a;
            case 2:
              jh = !0;
          }
        }
        null !== h.callback && 0 !== h.lane && (a.flags |= 64, r = e.effects, null === r ? e.effects = [h] : r.push(h));
      } else y = {
        eventTime: y,
        lane: r,
        tag: h.tag,
        payload: h.payload,
        callback: h.callback,
        next: null
      }, null === m ? (l = m = y, k = q) : m = m.next = y, g |= r;
      h = h.next;
      if (null === h) if (h = e.shared.pending, null === h) break;else r = h, h = r.next, r.next = null, e.lastBaseUpdate = r, e.shared.pending = null;
    } while (1);
    null === m && (k = q);
    e.baseState = k;
    e.firstBaseUpdate = l;
    e.lastBaseUpdate = m;
    b = e.shared.interleaved;
    if (null !== b) {
      e = b;
      do g |= e.lane, e = e.next; while (e !== b);
    } else null === f && (e.shared.lanes = 0);
    rh |= g;
    a.lanes = g;
    a.memoizedState = q;
  }
}
function sh(a, b, c) {
  a = b.effects;
  b.effects = null;
  if (null !== a) for (b = 0; b < a.length; b++) {
    var d = a[b],
      e = d.callback;
    if (null !== e) {
      d.callback = null;
      d = c;
      if ("function" !== typeof e) throw Error(p(191, e));
      e.call(d);
    }
  }
}
var th = {},
  uh = Uf(th),
  vh = Uf(th),
  wh = Uf(th);
function xh(a) {
  if (a === th) throw Error(p(174));
  return a;
}
function yh(a, b) {
  G(wh, b);
  G(vh, a);
  G(uh, th);
  a = b.nodeType;
  switch (a) {
    case 9:
    case 11:
      b = (b = b.documentElement) ? b.namespaceURI : lb(null, "");
      break;
    default:
      a = 8 === a ? b.parentNode : b, b = a.namespaceURI || null, a = a.tagName, b = lb(b, a);
  }
  E(uh);
  G(uh, b);
}
function zh() {
  E(uh);
  E(vh);
  E(wh);
}
function Ah(a) {
  xh(wh.current);
  var b = xh(uh.current);
  var c = lb(b, a.type);
  b !== c && (G(vh, a), G(uh, c));
}
function Bh(a) {
  vh.current === a && (E(uh), E(vh));
}
var L = Uf(0);
function Ch(a) {
  for (var b = a; null !== b;) {
    if (13 === b.tag) {
      var c = b.memoizedState;
      if (null !== c && (c = c.dehydrated, null === c || "$?" === c.data || "$!" === c.data)) return b;
    } else if (19 === b.tag && void 0 !== b.memoizedProps.revealOrder) {
      if (0 !== (b.flags & 128)) return b;
    } else if (null !== b.child) {
      b.child.return = b;
      b = b.child;
      continue;
    }
    if (b === a) break;
    for (; null === b.sibling;) {
      if (null === b.return || b.return === a) return null;
      b = b.return;
    }
    b.sibling.return = b.return;
    b = b.sibling;
  }
  return null;
}
var Dh = [];
function Eh() {
  for (var a = 0; a < Dh.length; a++) Dh[a]._workInProgressVersionPrimary = null;
  Dh.length = 0;
}
var Fh = ua.ReactCurrentDispatcher,
  Gh = ua.ReactCurrentBatchConfig,
  Hh = 0,
  M = null,
  N = null,
  O = null,
  Ih = !1,
  Jh = !1,
  Kh = 0,
  Lh = 0;
function P() {
  throw Error(p(321));
}
function Mh(a, b) {
  if (null === b) return !1;
  for (var c = 0; c < b.length && c < a.length; c++) if (!He(a[c], b[c])) return !1;
  return !0;
}
function Nh(a, b, c, d, e, f) {
  Hh = f;
  M = b;
  b.memoizedState = null;
  b.updateQueue = null;
  b.lanes = 0;
  Fh.current = null === a || null === a.memoizedState ? Oh : Ph;
  a = c(d, e);
  if (Jh) {
    f = 0;
    do {
      Jh = !1;
      Kh = 0;
      if (25 <= f) throw Error(p(301));
      f += 1;
      O = N = null;
      b.updateQueue = null;
      Fh.current = Qh;
      a = c(d, e);
    } while (Jh);
  }
  Fh.current = Rh;
  b = null !== N && null !== N.next;
  Hh = 0;
  O = N = M = null;
  Ih = !1;
  if (b) throw Error(p(300));
  return a;
}
function Sh() {
  var a = 0 !== Kh;
  Kh = 0;
  return a;
}
function Th() {
  var a = {
    memoizedState: null,
    baseState: null,
    baseQueue: null,
    queue: null,
    next: null
  };
  null === O ? M.memoizedState = O = a : O = O.next = a;
  return O;
}
function Uh() {
  if (null === N) {
    var a = M.alternate;
    a = null !== a ? a.memoizedState : null;
  } else a = N.next;
  var b = null === O ? M.memoizedState : O.next;
  if (null !== b) O = b, N = a;else {
    if (null === a) throw Error(p(310));
    N = a;
    a = {
      memoizedState: N.memoizedState,
      baseState: N.baseState,
      baseQueue: N.baseQueue,
      queue: N.queue,
      next: null
    };
    null === O ? M.memoizedState = O = a : O = O.next = a;
  }
  return O;
}
function Vh(a, b) {
  return "function" === typeof b ? b(a) : b;
}
function Wh(a) {
  var b = Uh(),
    c = b.queue;
  if (null === c) throw Error(p(311));
  c.lastRenderedReducer = a;
  var d = N,
    e = d.baseQueue,
    f = c.pending;
  if (null !== f) {
    if (null !== e) {
      var g = e.next;
      e.next = f.next;
      f.next = g;
    }
    d.baseQueue = e = f;
    c.pending = null;
  }
  if (null !== e) {
    f = e.next;
    d = d.baseState;
    var h = g = null,
      k = null,
      l = f;
    do {
      var m = l.lane;
      if ((Hh & m) === m) null !== k && (k = k.next = {
        lane: 0,
        action: l.action,
        hasEagerState: l.hasEagerState,
        eagerState: l.eagerState,
        next: null
      }), d = l.hasEagerState ? l.eagerState : a(d, l.action);else {
        var q = {
          lane: m,
          action: l.action,
          hasEagerState: l.hasEagerState,
          eagerState: l.eagerState,
          next: null
        };
        null === k ? (h = k = q, g = d) : k = k.next = q;
        M.lanes |= m;
        rh |= m;
      }
      l = l.next;
    } while (null !== l && l !== f);
    null === k ? g = d : k.next = h;
    He(d, b.memoizedState) || (dh = !0);
    b.memoizedState = d;
    b.baseState = g;
    b.baseQueue = k;
    c.lastRenderedState = d;
  }
  a = c.interleaved;
  if (null !== a) {
    e = a;
    do f = e.lane, M.lanes |= f, rh |= f, e = e.next; while (e !== a);
  } else null === e && (c.lanes = 0);
  return [b.memoizedState, c.dispatch];
}
function Xh(a) {
  var b = Uh(),
    c = b.queue;
  if (null === c) throw Error(p(311));
  c.lastRenderedReducer = a;
  var d = c.dispatch,
    e = c.pending,
    f = b.memoizedState;
  if (null !== e) {
    c.pending = null;
    var g = e = e.next;
    do f = a(f, g.action), g = g.next; while (g !== e);
    He(f, b.memoizedState) || (dh = !0);
    b.memoizedState = f;
    null === b.baseQueue && (b.baseState = f);
    c.lastRenderedState = f;
  }
  return [f, d];
}
function Yh() {}
function Zh(a, b) {
  var c = M,
    d = Uh(),
    e = b(),
    f = !He(d.memoizedState, e);
  f && (d.memoizedState = e, dh = !0);
  d = d.queue;
  $h(ai.bind(null, c, d, a), [a]);
  if (d.getSnapshot !== b || f || null !== O && O.memoizedState.tag & 1) {
    c.flags |= 2048;
    bi(9, ci.bind(null, c, d, e, b), void 0, null);
    if (null === Q) throw Error(p(349));
    0 !== (Hh & 30) || di(c, b, e);
  }
  return e;
}
function di(a, b, c) {
  a.flags |= 16384;
  a = {
    getSnapshot: b,
    value: c
  };
  b = M.updateQueue;
  null === b ? (b = {
    lastEffect: null,
    stores: null
  }, M.updateQueue = b, b.stores = [a]) : (c = b.stores, null === c ? b.stores = [a] : c.push(a));
}
function ci(a, b, c, d) {
  b.value = c;
  b.getSnapshot = d;
  ei(b) && fi(a);
}
function ai(a, b, c) {
  return c(function () {
    ei(b) && fi(a);
  });
}
function ei(a) {
  var b = a.getSnapshot;
  a = a.value;
  try {
    var c = b();
    return !He(a, c);
  } catch (d) {
    return !0;
  }
}
function fi(a) {
  var b = ih(a, 1);
  null !== b && gi(b, a, 1, -1);
}
function hi(a) {
  var b = Th();
  "function" === typeof a && (a = a());
  b.memoizedState = b.baseState = a;
  a = {
    pending: null,
    interleaved: null,
    lanes: 0,
    dispatch: null,
    lastRenderedReducer: Vh,
    lastRenderedState: a
  };
  b.queue = a;
  a = a.dispatch = ii.bind(null, M, a);
  return [b.memoizedState, a];
}
function bi(a, b, c, d) {
  a = {
    tag: a,
    create: b,
    destroy: c,
    deps: d,
    next: null
  };
  b = M.updateQueue;
  null === b ? (b = {
    lastEffect: null,
    stores: null
  }, M.updateQueue = b, b.lastEffect = a.next = a) : (c = b.lastEffect, null === c ? b.lastEffect = a.next = a : (d = c.next, c.next = a, a.next = d, b.lastEffect = a));
  return a;
}
function ji() {
  return Uh().memoizedState;
}
function ki(a, b, c, d) {
  var e = Th();
  M.flags |= a;
  e.memoizedState = bi(1 | b, c, void 0, void 0 === d ? null : d);
}
function li(a, b, c, d) {
  var e = Uh();
  d = void 0 === d ? null : d;
  var f = void 0;
  if (null !== N) {
    var g = N.memoizedState;
    f = g.destroy;
    if (null !== d && Mh(d, g.deps)) {
      e.memoizedState = bi(b, c, f, d);
      return;
    }
  }
  M.flags |= a;
  e.memoizedState = bi(1 | b, c, f, d);
}
function mi(a, b) {
  return ki(8390656, 8, a, b);
}
function $h(a, b) {
  return li(2048, 8, a, b);
}
function ni(a, b) {
  return li(4, 2, a, b);
}
function oi(a, b) {
  return li(4, 4, a, b);
}
function pi(a, b) {
  if ("function" === typeof b) return a = a(), b(a), function () {
    b(null);
  };
  if (null !== b && void 0 !== b) return a = a(), b.current = a, function () {
    b.current = null;
  };
}
function qi(a, b, c) {
  c = null !== c && void 0 !== c ? c.concat([a]) : null;
  return li(4, 4, pi.bind(null, b, a), c);
}
function ri() {}
function si(a, b) {
  var c = Uh();
  b = void 0 === b ? null : b;
  var d = c.memoizedState;
  if (null !== d && null !== b && Mh(b, d[1])) return d[0];
  c.memoizedState = [a, b];
  return a;
}
function ti(a, b) {
  var c = Uh();
  b = void 0 === b ? null : b;
  var d = c.memoizedState;
  if (null !== d && null !== b && Mh(b, d[1])) return d[0];
  a = a();
  c.memoizedState = [a, b];
  return a;
}
function ui(a, b, c) {
  if (0 === (Hh & 21)) return a.baseState && (a.baseState = !1, dh = !0), a.memoizedState = c;
  He(c, b) || (c = yc(), M.lanes |= c, rh |= c, a.baseState = !0);
  return b;
}
function vi(a, b) {
  var c = C;
  C = 0 !== c && 4 > c ? c : 4;
  a(!0);
  var d = Gh.transition;
  Gh.transition = {};
  try {
    a(!1), b();
  } finally {
    C = c, Gh.transition = d;
  }
}
function wi() {
  return Uh().memoizedState;
}
function xi(a, b, c) {
  var d = yi(a);
  c = {
    lane: d,
    action: c,
    hasEagerState: !1,
    eagerState: null,
    next: null
  };
  if (zi(a)) Ai(b, c);else if (c = hh(a, b, c, d), null !== c) {
    var e = R();
    gi(c, a, d, e);
    Bi(c, b, d);
  }
}
function ii(a, b, c) {
  var d = yi(a),
    e = {
      lane: d,
      action: c,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
  if (zi(a)) Ai(b, e);else {
    var f = a.alternate;
    if (0 === a.lanes && (null === f || 0 === f.lanes) && (f = b.lastRenderedReducer, null !== f)) try {
      var g = b.lastRenderedState,
        h = f(g, c);
      e.hasEagerState = !0;
      e.eagerState = h;
      if (He(h, g)) {
        var k = b.interleaved;
        null === k ? (e.next = e, gh(b)) : (e.next = k.next, k.next = e);
        b.interleaved = e;
        return;
      }
    } catch (l) {} finally {}
    c = hh(a, b, e, d);
    null !== c && (e = R(), gi(c, a, d, e), Bi(c, b, d));
  }
}
function zi(a) {
  var b = a.alternate;
  return a === M || null !== b && b === M;
}
function Ai(a, b) {
  Jh = Ih = !0;
  var c = a.pending;
  null === c ? b.next = b : (b.next = c.next, c.next = b);
  a.pending = b;
}
function Bi(a, b, c) {
  if (0 !== (c & 4194240)) {
    var d = b.lanes;
    d &= a.pendingLanes;
    c |= d;
    b.lanes = c;
    Cc(a, c);
  }
}
var Rh = {
    readContext: eh,
    useCallback: P,
    useContext: P,
    useEffect: P,
    useImperativeHandle: P,
    useInsertionEffect: P,
    useLayoutEffect: P,
    useMemo: P,
    useReducer: P,
    useRef: P,
    useState: P,
    useDebugValue: P,
    useDeferredValue: P,
    useTransition: P,
    useMutableSource: P,
    useSyncExternalStore: P,
    useId: P,
    unstable_isNewReconciler: !1
  },
  Oh = {
    readContext: eh,
    useCallback: function (a, b) {
      Th().memoizedState = [a, void 0 === b ? null : b];
      return a;
    },
    useContext: eh,
    useEffect: mi,
    useImperativeHandle: function (a, b, c) {
      c = null !== c && void 0 !== c ? c.concat([a]) : null;
      return ki(4194308, 4, pi.bind(null, b, a), c);
    },
    useLayoutEffect: function (a, b) {
      return ki(4194308, 4, a, b);
    },
    useInsertionEffect: function (a, b) {
      return ki(4, 2, a, b);
    },
    useMemo: function (a, b) {
      var c = Th();
      b = void 0 === b ? null : b;
      a = a();
      c.memoizedState = [a, b];
      return a;
    },
    useReducer: function (a, b, c) {
      var d = Th();
      b = void 0 !== c ? c(b) : b;
      d.memoizedState = d.baseState = b;
      a = {
        pending: null,
        interleaved: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: a,
        lastRenderedState: b
      };
      d.queue = a;
      a = a.dispatch = xi.bind(null, M, a);
      return [d.memoizedState, a];
    },
    useRef: function (a) {
      var b = Th();
      a = {
        current: a
      };
      return b.memoizedState = a;
    },
    useState: hi,
    useDebugValue: ri,
    useDeferredValue: function (a) {
      return Th().memoizedState = a;
    },
    useTransition: function () {
      var a = hi(!1),
        b = a[0];
      a = vi.bind(null, a[1]);
      Th().memoizedState = a;
      return [b, a];
    },
    useMutableSource: function () {},
    useSyncExternalStore: function (a, b, c) {
      var d = M,
        e = Th();
      if (I) {
        if (void 0 === c) throw Error(p(407));
        c = c();
      } else {
        c = b();
        if (null === Q) throw Error(p(349));
        0 !== (Hh & 30) || di(d, b, c);
      }
      e.memoizedState = c;
      var f = {
        value: c,
        getSnapshot: b
      };
      e.queue = f;
      mi(ai.bind(null, d, f, a), [a]);
      d.flags |= 2048;
      bi(9, ci.bind(null, d, f, c, b), void 0, null);
      return c;
    },
    useId: function () {
      var a = Th(),
        b = Q.identifierPrefix;
      if (I) {
        var c = sg;
        var d = rg;
        c = (d & ~(1 << 32 - oc(d) - 1)).toString(32) + c;
        b = ":" + b + "R" + c;
        c = Kh++;
        0 < c && (b += "H" + c.toString(32));
        b += ":";
      } else c = Lh++, b = ":" + b + "r" + c.toString(32) + ":";
      return a.memoizedState = b;
    },
    unstable_isNewReconciler: !1
  },
  Ph = {
    readContext: eh,
    useCallback: si,
    useContext: eh,
    useEffect: $h,
    useImperativeHandle: qi,
    useInsertionEffect: ni,
    useLayoutEffect: oi,
    useMemo: ti,
    useReducer: Wh,
    useRef: ji,
    useState: function () {
      return Wh(Vh);
    },
    useDebugValue: ri,
    useDeferredValue: function (a) {
      var b = Uh();
      return ui(b, N.memoizedState, a);
    },
    useTransition: function () {
      var a = Wh(Vh)[0],
        b = Uh().memoizedState;
      return [a, b];
    },
    useMutableSource: Yh,
    useSyncExternalStore: Zh,
    useId: wi,
    unstable_isNewReconciler: !1
  },
  Qh = {
    readContext: eh,
    useCallback: si,
    useContext: eh,
    useEffect: $h,
    useImperativeHandle: qi,
    useInsertionEffect: ni,
    useLayoutEffect: oi,
    useMemo: ti,
    useReducer: Xh,
    useRef: ji,
    useState: function () {
      return Xh(Vh);
    },
    useDebugValue: ri,
    useDeferredValue: function (a) {
      var b = Uh();
      return null === N ? b.memoizedState = a : ui(b, N.memoizedState, a);
    },
    useTransition: function () {
      var a = Xh(Vh)[0],
        b = Uh().memoizedState;
      return [a, b];
    },
    useMutableSource: Yh,
    useSyncExternalStore: Zh,
    useId: wi,
    unstable_isNewReconciler: !1
  };
function Ci(a, b) {
  if (a && a.defaultProps) {
    b = A({}, b);
    a = a.defaultProps;
    for (var c in a) void 0 === b[c] && (b[c] = a[c]);
    return b;
  }
  return b;
}
function Di(a, b, c, d) {
  b = a.memoizedState;
  c = c(d, b);
  c = null === c || void 0 === c ? b : A({}, b, c);
  a.memoizedState = c;
  0 === a.lanes && (a.updateQueue.baseState = c);
}
var Ei = {
  isMounted: function (a) {
    return (a = a._reactInternals) ? Vb(a) === a : !1;
  },
  enqueueSetState: function (a, b, c) {
    a = a._reactInternals;
    var d = R(),
      e = yi(a),
      f = mh(d, e);
    f.payload = b;
    void 0 !== c && null !== c && (f.callback = c);
    b = nh(a, f, e);
    null !== b && (gi(b, a, e, d), oh(b, a, e));
  },
  enqueueReplaceState: function (a, b, c) {
    a = a._reactInternals;
    var d = R(),
      e = yi(a),
      f = mh(d, e);
    f.tag = 1;
    f.payload = b;
    void 0 !== c && null !== c && (f.callback = c);
    b = nh(a, f, e);
    null !== b && (gi(b, a, e, d), oh(b, a, e));
  },
  enqueueForceUpdate: function (a, b) {
    a = a._reactInternals;
    var c = R(),
      d = yi(a),
      e = mh(c, d);
    e.tag = 2;
    void 0 !== b && null !== b && (e.callback = b);
    b = nh(a, e, d);
    null !== b && (gi(b, a, d, c), oh(b, a, d));
  }
};
function Fi(a, b, c, d, e, f, g) {
  a = a.stateNode;
  return "function" === typeof a.shouldComponentUpdate ? a.shouldComponentUpdate(d, f, g) : b.prototype && b.prototype.isPureReactComponent ? !Ie(c, d) || !Ie(e, f) : !0;
}
function Gi(a, b, c) {
  var d = !1,
    e = Vf;
  var f = b.contextType;
  "object" === typeof f && null !== f ? f = eh(f) : (e = Zf(b) ? Xf : H.current, d = b.contextTypes, f = (d = null !== d && void 0 !== d) ? Yf(a, e) : Vf);
  b = new b(c, f);
  a.memoizedState = null !== b.state && void 0 !== b.state ? b.state : null;
  b.updater = Ei;
  a.stateNode = b;
  b._reactInternals = a;
  d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = e, a.__reactInternalMemoizedMaskedChildContext = f);
  return b;
}
function Hi(a, b, c, d) {
  a = b.state;
  "function" === typeof b.componentWillReceiveProps && b.componentWillReceiveProps(c, d);
  "function" === typeof b.UNSAFE_componentWillReceiveProps && b.UNSAFE_componentWillReceiveProps(c, d);
  b.state !== a && Ei.enqueueReplaceState(b, b.state, null);
}
function Ii(a, b, c, d) {
  var e = a.stateNode;
  e.props = c;
  e.state = a.memoizedState;
  e.refs = {};
  kh(a);
  var f = b.contextType;
  "object" === typeof f && null !== f ? e.context = eh(f) : (f = Zf(b) ? Xf : H.current, e.context = Yf(a, f));
  e.state = a.memoizedState;
  f = b.getDerivedStateFromProps;
  "function" === typeof f && (Di(a, b, f, c), e.state = a.memoizedState);
  "function" === typeof b.getDerivedStateFromProps || "function" === typeof e.getSnapshotBeforeUpdate || "function" !== typeof e.UNSAFE_componentWillMount && "function" !== typeof e.componentWillMount || (b = e.state, "function" === typeof e.componentWillMount && e.componentWillMount(), "function" === typeof e.UNSAFE_componentWillMount && e.UNSAFE_componentWillMount(), b !== e.state && Ei.enqueueReplaceState(e, e.state, null), qh(a, c, e, d), e.state = a.memoizedState);
  "function" === typeof e.componentDidMount && (a.flags |= 4194308);
}
function Ji(a, b) {
  try {
    var c = "",
      d = b;
    do c += Pa(d), d = d.return; while (d);
    var e = c;
  } catch (f) {
    e = "\nError generating stack: " + f.message + "\n" + f.stack;
  }
  return {
    value: a,
    source: b,
    stack: e,
    digest: null
  };
}
function Ki(a, b, c) {
  return {
    value: a,
    source: null,
    stack: null != c ? c : null,
    digest: null != b ? b : null
  };
}
function Li(a, b) {
  try {
    console.error(b.value);
  } catch (c) {
    setTimeout(function () {
      throw c;
    });
  }
}
var Mi = "function" === typeof WeakMap ? WeakMap : Map;
function Ni(a, b, c) {
  c = mh(-1, c);
  c.tag = 3;
  c.payload = {
    element: null
  };
  var d = b.value;
  c.callback = function () {
    Oi || (Oi = !0, Pi = d);
    Li(a, b);
  };
  return c;
}
function Qi(a, b, c) {
  c = mh(-1, c);
  c.tag = 3;
  var d = a.type.getDerivedStateFromError;
  if ("function" === typeof d) {
    var e = b.value;
    c.payload = function () {
      return d(e);
    };
    c.callback = function () {
      Li(a, b);
    };
  }
  var f = a.stateNode;
  null !== f && "function" === typeof f.componentDidCatch && (c.callback = function () {
    Li(a, b);
    "function" !== typeof d && (null === Ri ? Ri = new Set([this]) : Ri.add(this));
    var c = b.stack;
    this.componentDidCatch(b.value, {
      componentStack: null !== c ? c : ""
    });
  });
  return c;
}
function Si(a, b, c) {
  var d = a.pingCache;
  if (null === d) {
    d = a.pingCache = new Mi();
    var e = new Set();
    d.set(b, e);
  } else e = d.get(b), void 0 === e && (e = new Set(), d.set(b, e));
  e.has(c) || (e.add(c), a = Ti.bind(null, a, b, c), b.then(a, a));
}
function Ui(a) {
  do {
    var b;
    if (b = 13 === a.tag) b = a.memoizedState, b = null !== b ? null !== b.dehydrated ? !0 : !1 : !0;
    if (b) return a;
    a = a.return;
  } while (null !== a);
  return null;
}
function Vi(a, b, c, d, e) {
  if (0 === (a.mode & 1)) return a === b ? a.flags |= 65536 : (a.flags |= 128, c.flags |= 131072, c.flags &= -52805, 1 === c.tag && (null === c.alternate ? c.tag = 17 : (b = mh(-1, 1), b.tag = 2, nh(c, b, 1))), c.lanes |= 1), a;
  a.flags |= 65536;
  a.lanes = e;
  return a;
}
var Wi = ua.ReactCurrentOwner,
  dh = !1;
function Xi(a, b, c, d) {
  b.child = null === a ? Vg(b, null, c, d) : Ug(b, a.child, c, d);
}
function Yi(a, b, c, d, e) {
  c = c.render;
  var f = b.ref;
  ch(b, e);
  d = Nh(a, b, c, d, f, e);
  c = Sh();
  if (null !== a && !dh) return b.updateQueue = a.updateQueue, b.flags &= -2053, a.lanes &= ~e, Zi(a, b, e);
  I && c && vg(b);
  b.flags |= 1;
  Xi(a, b, d, e);
  return b.child;
}
function $i(a, b, c, d, e) {
  if (null === a) {
    var f = c.type;
    if ("function" === typeof f && !aj(f) && void 0 === f.defaultProps && null === c.compare && void 0 === c.defaultProps) return b.tag = 15, b.type = f, bj(a, b, f, d, e);
    a = Rg(c.type, null, d, b, b.mode, e);
    a.ref = b.ref;
    a.return = b;
    return b.child = a;
  }
  f = a.child;
  if (0 === (a.lanes & e)) {
    var g = f.memoizedProps;
    c = c.compare;
    c = null !== c ? c : Ie;
    if (c(g, d) && a.ref === b.ref) return Zi(a, b, e);
  }
  b.flags |= 1;
  a = Pg(f, d);
  a.ref = b.ref;
  a.return = b;
  return b.child = a;
}
function bj(a, b, c, d, e) {
  if (null !== a) {
    var f = a.memoizedProps;
    if (Ie(f, d) && a.ref === b.ref) if (dh = !1, b.pendingProps = d = f, 0 !== (a.lanes & e)) 0 !== (a.flags & 131072) && (dh = !0);else return b.lanes = a.lanes, Zi(a, b, e);
  }
  return cj(a, b, c, d, e);
}
function dj(a, b, c) {
  var d = b.pendingProps,
    e = d.children,
    f = null !== a ? a.memoizedState : null;
  if ("hidden" === d.mode) {
    if (0 === (b.mode & 1)) b.memoizedState = {
      baseLanes: 0,
      cachePool: null,
      transitions: null
    }, G(ej, fj), fj |= c;else {
      if (0 === (c & 1073741824)) return a = null !== f ? f.baseLanes | c : c, b.lanes = b.childLanes = 1073741824, b.memoizedState = {
        baseLanes: a,
        cachePool: null,
        transitions: null
      }, b.updateQueue = null, G(ej, fj), fj |= a, null;
      b.memoizedState = {
        baseLanes: 0,
        cachePool: null,
        transitions: null
      };
      d = null !== f ? f.baseLanes : c;
      G(ej, fj);
      fj |= d;
    }
  } else null !== f ? (d = f.baseLanes | c, b.memoizedState = null) : d = c, G(ej, fj), fj |= d;
  Xi(a, b, e, c);
  return b.child;
}
function gj(a, b) {
  var c = b.ref;
  if (null === a && null !== c || null !== a && a.ref !== c) b.flags |= 512, b.flags |= 2097152;
}
function cj(a, b, c, d, e) {
  var f = Zf(c) ? Xf : H.current;
  f = Yf(b, f);
  ch(b, e);
  c = Nh(a, b, c, d, f, e);
  d = Sh();
  if (null !== a && !dh) return b.updateQueue = a.updateQueue, b.flags &= -2053, a.lanes &= ~e, Zi(a, b, e);
  I && d && vg(b);
  b.flags |= 1;
  Xi(a, b, c, e);
  return b.child;
}
function hj(a, b, c, d, e) {
  if (Zf(c)) {
    var f = !0;
    cg(b);
  } else f = !1;
  ch(b, e);
  if (null === b.stateNode) ij(a, b), Gi(b, c, d), Ii(b, c, d, e), d = !0;else if (null === a) {
    var g = b.stateNode,
      h = b.memoizedProps;
    g.props = h;
    var k = g.context,
      l = c.contextType;
    "object" === typeof l && null !== l ? l = eh(l) : (l = Zf(c) ? Xf : H.current, l = Yf(b, l));
    var m = c.getDerivedStateFromProps,
      q = "function" === typeof m || "function" === typeof g.getSnapshotBeforeUpdate;
    q || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== d || k !== l) && Hi(b, g, d, l);
    jh = !1;
    var r = b.memoizedState;
    g.state = r;
    qh(b, d, g, e);
    k = b.memoizedState;
    h !== d || r !== k || Wf.current || jh ? ("function" === typeof m && (Di(b, c, m, d), k = b.memoizedState), (h = jh || Fi(b, c, h, d, r, k, l)) ? (q || "function" !== typeof g.UNSAFE_componentWillMount && "function" !== typeof g.componentWillMount || ("function" === typeof g.componentWillMount && g.componentWillMount(), "function" === typeof g.UNSAFE_componentWillMount && g.UNSAFE_componentWillMount()), "function" === typeof g.componentDidMount && (b.flags |= 4194308)) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), b.memoizedProps = d, b.memoizedState = k), g.props = d, g.state = k, g.context = l, d = h) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), d = !1);
  } else {
    g = b.stateNode;
    lh(a, b);
    h = b.memoizedProps;
    l = b.type === b.elementType ? h : Ci(b.type, h);
    g.props = l;
    q = b.pendingProps;
    r = g.context;
    k = c.contextType;
    "object" === typeof k && null !== k ? k = eh(k) : (k = Zf(c) ? Xf : H.current, k = Yf(b, k));
    var y = c.getDerivedStateFromProps;
    (m = "function" === typeof y || "function" === typeof g.getSnapshotBeforeUpdate) || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== q || r !== k) && Hi(b, g, d, k);
    jh = !1;
    r = b.memoizedState;
    g.state = r;
    qh(b, d, g, e);
    var n = b.memoizedState;
    h !== q || r !== n || Wf.current || jh ? ("function" === typeof y && (Di(b, c, y, d), n = b.memoizedState), (l = jh || Fi(b, c, l, d, r, n, k) || !1) ? (m || "function" !== typeof g.UNSAFE_componentWillUpdate && "function" !== typeof g.componentWillUpdate || ("function" === typeof g.componentWillUpdate && g.componentWillUpdate(d, n, k), "function" === typeof g.UNSAFE_componentWillUpdate && g.UNSAFE_componentWillUpdate(d, n, k)), "function" === typeof g.componentDidUpdate && (b.flags |= 4), "function" === typeof g.getSnapshotBeforeUpdate && (b.flags |= 1024)) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r === a.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r === a.memoizedState || (b.flags |= 1024), b.memoizedProps = d, b.memoizedState = n), g.props = d, g.state = n, g.context = k, d = l) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r === a.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r === a.memoizedState || (b.flags |= 1024), d = !1);
  }
  return jj(a, b, c, d, f, e);
}
function jj(a, b, c, d, e, f) {
  gj(a, b);
  var g = 0 !== (b.flags & 128);
  if (!d && !g) return e && dg(b, c, !1), Zi(a, b, f);
  d = b.stateNode;
  Wi.current = b;
  var h = g && "function" !== typeof c.getDerivedStateFromError ? null : d.render();
  b.flags |= 1;
  null !== a && g ? (b.child = Ug(b, a.child, null, f), b.child = Ug(b, null, h, f)) : Xi(a, b, h, f);
  b.memoizedState = d.state;
  e && dg(b, c, !0);
  return b.child;
}
function kj(a) {
  var b = a.stateNode;
  b.pendingContext ? ag(a, b.pendingContext, b.pendingContext !== b.context) : b.context && ag(a, b.context, !1);
  yh(a, b.containerInfo);
}
function lj(a, b, c, d, e) {
  Ig();
  Jg(e);
  b.flags |= 256;
  Xi(a, b, c, d);
  return b.child;
}
var mj = {
  dehydrated: null,
  treeContext: null,
  retryLane: 0
};
function nj(a) {
  return {
    baseLanes: a,
    cachePool: null,
    transitions: null
  };
}
function oj(a, b, c) {
  var d = b.pendingProps,
    e = L.current,
    f = !1,
    g = 0 !== (b.flags & 128),
    h;
  (h = g) || (h = null !== a && null === a.memoizedState ? !1 : 0 !== (e & 2));
  if (h) f = !0, b.flags &= -129;else if (null === a || null !== a.memoizedState) e |= 1;
  G(L, e & 1);
  if (null === a) {
    Eg(b);
    a = b.memoizedState;
    if (null !== a && (a = a.dehydrated, null !== a)) return 0 === (b.mode & 1) ? b.lanes = 1 : "$!" === a.data ? b.lanes = 8 : b.lanes = 1073741824, null;
    g = d.children;
    a = d.fallback;
    return f ? (d = b.mode, f = b.child, g = {
      mode: "hidden",
      children: g
    }, 0 === (d & 1) && null !== f ? (f.childLanes = 0, f.pendingProps = g) : f = pj(g, d, 0, null), a = Tg(a, d, c, null), f.return = b, a.return = b, f.sibling = a, b.child = f, b.child.memoizedState = nj(c), b.memoizedState = mj, a) : qj(b, g);
  }
  e = a.memoizedState;
  if (null !== e && (h = e.dehydrated, null !== h)) return rj(a, b, g, d, h, e, c);
  if (f) {
    f = d.fallback;
    g = b.mode;
    e = a.child;
    h = e.sibling;
    var k = {
      mode: "hidden",
      children: d.children
    };
    0 === (g & 1) && b.child !== e ? (d = b.child, d.childLanes = 0, d.pendingProps = k, b.deletions = null) : (d = Pg(e, k), d.subtreeFlags = e.subtreeFlags & 14680064);
    null !== h ? f = Pg(h, f) : (f = Tg(f, g, c, null), f.flags |= 2);
    f.return = b;
    d.return = b;
    d.sibling = f;
    b.child = d;
    d = f;
    f = b.child;
    g = a.child.memoizedState;
    g = null === g ? nj(c) : {
      baseLanes: g.baseLanes | c,
      cachePool: null,
      transitions: g.transitions
    };
    f.memoizedState = g;
    f.childLanes = a.childLanes & ~c;
    b.memoizedState = mj;
    return d;
  }
  f = a.child;
  a = f.sibling;
  d = Pg(f, {
    mode: "visible",
    children: d.children
  });
  0 === (b.mode & 1) && (d.lanes = c);
  d.return = b;
  d.sibling = null;
  null !== a && (c = b.deletions, null === c ? (b.deletions = [a], b.flags |= 16) : c.push(a));
  b.child = d;
  b.memoizedState = null;
  return d;
}
function qj(a, b) {
  b = pj({
    mode: "visible",
    children: b
  }, a.mode, 0, null);
  b.return = a;
  return a.child = b;
}
function sj(a, b, c, d) {
  null !== d && Jg(d);
  Ug(b, a.child, null, c);
  a = qj(b, b.pendingProps.children);
  a.flags |= 2;
  b.memoizedState = null;
  return a;
}
function rj(a, b, c, d, e, f, g) {
  if (c) {
    if (b.flags & 256) return b.flags &= -257, d = Ki(Error(p(422))), sj(a, b, g, d);
    if (null !== b.memoizedState) return b.child = a.child, b.flags |= 128, null;
    f = d.fallback;
    e = b.mode;
    d = pj({
      mode: "visible",
      children: d.children
    }, e, 0, null);
    f = Tg(f, e, g, null);
    f.flags |= 2;
    d.return = b;
    f.return = b;
    d.sibling = f;
    b.child = d;
    0 !== (b.mode & 1) && Ug(b, a.child, null, g);
    b.child.memoizedState = nj(g);
    b.memoizedState = mj;
    return f;
  }
  if (0 === (b.mode & 1)) return sj(a, b, g, null);
  if ("$!" === e.data) {
    d = e.nextSibling && e.nextSibling.dataset;
    if (d) var h = d.dgst;
    d = h;
    f = Error(p(419));
    d = Ki(f, d, void 0);
    return sj(a, b, g, d);
  }
  h = 0 !== (g & a.childLanes);
  if (dh || h) {
    d = Q;
    if (null !== d) {
      switch (g & -g) {
        case 4:
          e = 2;
          break;
        case 16:
          e = 8;
          break;
        case 64:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
        case 67108864:
          e = 32;
          break;
        case 536870912:
          e = 268435456;
          break;
        default:
          e = 0;
      }
      e = 0 !== (e & (d.suspendedLanes | g)) ? 0 : e;
      0 !== e && e !== f.retryLane && (f.retryLane = e, ih(a, e), gi(d, a, e, -1));
    }
    tj();
    d = Ki(Error(p(421)));
    return sj(a, b, g, d);
  }
  if ("$?" === e.data) return b.flags |= 128, b.child = a.child, b = uj.bind(null, a), e._reactRetry = b, null;
  a = f.treeContext;
  yg = Lf(e.nextSibling);
  xg = b;
  I = !0;
  zg = null;
  null !== a && (og[pg++] = rg, og[pg++] = sg, og[pg++] = qg, rg = a.id, sg = a.overflow, qg = b);
  b = qj(b, d.children);
  b.flags |= 4096;
  return b;
}
function vj(a, b, c) {
  a.lanes |= b;
  var d = a.alternate;
  null !== d && (d.lanes |= b);
  bh(a.return, b, c);
}
function wj(a, b, c, d, e) {
  var f = a.memoizedState;
  null === f ? a.memoizedState = {
    isBackwards: b,
    rendering: null,
    renderingStartTime: 0,
    last: d,
    tail: c,
    tailMode: e
  } : (f.isBackwards = b, f.rendering = null, f.renderingStartTime = 0, f.last = d, f.tail = c, f.tailMode = e);
}
function xj(a, b, c) {
  var d = b.pendingProps,
    e = d.revealOrder,
    f = d.tail;
  Xi(a, b, d.children, c);
  d = L.current;
  if (0 !== (d & 2)) d = d & 1 | 2, b.flags |= 128;else {
    if (null !== a && 0 !== (a.flags & 128)) a: for (a = b.child; null !== a;) {
      if (13 === a.tag) null !== a.memoizedState && vj(a, c, b);else if (19 === a.tag) vj(a, c, b);else if (null !== a.child) {
        a.child.return = a;
        a = a.child;
        continue;
      }
      if (a === b) break a;
      for (; null === a.sibling;) {
        if (null === a.return || a.return === b) break a;
        a = a.return;
      }
      a.sibling.return = a.return;
      a = a.sibling;
    }
    d &= 1;
  }
  G(L, d);
  if (0 === (b.mode & 1)) b.memoizedState = null;else switch (e) {
    case "forwards":
      c = b.child;
      for (e = null; null !== c;) a = c.alternate, null !== a && null === Ch(a) && (e = c), c = c.sibling;
      c = e;
      null === c ? (e = b.child, b.child = null) : (e = c.sibling, c.sibling = null);
      wj(b, !1, e, c, f);
      break;
    case "backwards":
      c = null;
      e = b.child;
      for (b.child = null; null !== e;) {
        a = e.alternate;
        if (null !== a && null === Ch(a)) {
          b.child = e;
          break;
        }
        a = e.sibling;
        e.sibling = c;
        c = e;
        e = a;
      }
      wj(b, !0, c, null, f);
      break;
    case "together":
      wj(b, !1, null, null, void 0);
      break;
    default:
      b.memoizedState = null;
  }
  return b.child;
}
function ij(a, b) {
  0 === (b.mode & 1) && null !== a && (a.alternate = null, b.alternate = null, b.flags |= 2);
}
function Zi(a, b, c) {
  null !== a && (b.dependencies = a.dependencies);
  rh |= b.lanes;
  if (0 === (c & b.childLanes)) return null;
  if (null !== a && b.child !== a.child) throw Error(p(153));
  if (null !== b.child) {
    a = b.child;
    c = Pg(a, a.pendingProps);
    b.child = c;
    for (c.return = b; null !== a.sibling;) a = a.sibling, c = c.sibling = Pg(a, a.pendingProps), c.return = b;
    c.sibling = null;
  }
  return b.child;
}
function yj(a, b, c) {
  switch (b.tag) {
    case 3:
      kj(b);
      Ig();
      break;
    case 5:
      Ah(b);
      break;
    case 1:
      Zf(b.type) && cg(b);
      break;
    case 4:
      yh(b, b.stateNode.containerInfo);
      break;
    case 10:
      var d = b.type._context,
        e = b.memoizedProps.value;
      G(Wg, d._currentValue);
      d._currentValue = e;
      break;
    case 13:
      d = b.memoizedState;
      if (null !== d) {
        if (null !== d.dehydrated) return G(L, L.current & 1), b.flags |= 128, null;
        if (0 !== (c & b.child.childLanes)) return oj(a, b, c);
        G(L, L.current & 1);
        a = Zi(a, b, c);
        return null !== a ? a.sibling : null;
      }
      G(L, L.current & 1);
      break;
    case 19:
      d = 0 !== (c & b.childLanes);
      if (0 !== (a.flags & 128)) {
        if (d) return xj(a, b, c);
        b.flags |= 128;
      }
      e = b.memoizedState;
      null !== e && (e.rendering = null, e.tail = null, e.lastEffect = null);
      G(L, L.current);
      if (d) break;else return null;
    case 22:
    case 23:
      return b.lanes = 0, dj(a, b, c);
  }
  return Zi(a, b, c);
}
var zj, Aj, Bj, Cj;
zj = function (a, b) {
  for (var c = b.child; null !== c;) {
    if (5 === c.tag || 6 === c.tag) a.appendChild(c.stateNode);else if (4 !== c.tag && null !== c.child) {
      c.child.return = c;
      c = c.child;
      continue;
    }
    if (c === b) break;
    for (; null === c.sibling;) {
      if (null === c.return || c.return === b) return;
      c = c.return;
    }
    c.sibling.return = c.return;
    c = c.sibling;
  }
};
Aj = function () {};
Bj = function (a, b, c, d) {
  var e = a.memoizedProps;
  if (e !== d) {
    a = b.stateNode;
    xh(uh.current);
    var f = null;
    switch (c) {
      case "input":
        e = Ya(a, e);
        d = Ya(a, d);
        f = [];
        break;
      case "select":
        e = A({}, e, {
          value: void 0
        });
        d = A({}, d, {
          value: void 0
        });
        f = [];
        break;
      case "textarea":
        e = gb(a, e);
        d = gb(a, d);
        f = [];
        break;
      default:
        "function" !== typeof e.onClick && "function" === typeof d.onClick && (a.onclick = Bf);
    }
    ub(c, d);
    var g;
    c = null;
    for (l in e) if (!d.hasOwnProperty(l) && e.hasOwnProperty(l) && null != e[l]) if ("style" === l) {
      var h = e[l];
      for (g in h) h.hasOwnProperty(g) && (c || (c = {}), c[g] = "");
    } else "dangerouslySetInnerHTML" !== l && "children" !== l && "suppressContentEditableWarning" !== l && "suppressHydrationWarning" !== l && "autoFocus" !== l && (ea.hasOwnProperty(l) ? f || (f = []) : (f = f || []).push(l, null));
    for (l in d) {
      var k = d[l];
      h = null != e ? e[l] : void 0;
      if (d.hasOwnProperty(l) && k !== h && (null != k || null != h)) if ("style" === l) {
        if (h) {
          for (g in h) !h.hasOwnProperty(g) || k && k.hasOwnProperty(g) || (c || (c = {}), c[g] = "");
          for (g in k) k.hasOwnProperty(g) && h[g] !== k[g] && (c || (c = {}), c[g] = k[g]);
        } else c || (f || (f = []), f.push(l, c)), c = k;
      } else "dangerouslySetInnerHTML" === l ? (k = k ? k.__html : void 0, h = h ? h.__html : void 0, null != k && h !== k && (f = f || []).push(l, k)) : "children" === l ? "string" !== typeof k && "number" !== typeof k || (f = f || []).push(l, "" + k) : "suppressContentEditableWarning" !== l && "suppressHydrationWarning" !== l && (ea.hasOwnProperty(l) ? (null != k && "onScroll" === l && D("scroll", a), f || h === k || (f = [])) : (f = f || []).push(l, k));
    }
    c && (f = f || []).push("style", c);
    var l = f;
    if (b.updateQueue = l) b.flags |= 4;
  }
};
Cj = function (a, b, c, d) {
  c !== d && (b.flags |= 4);
};
function Dj(a, b) {
  if (!I) switch (a.tailMode) {
    case "hidden":
      b = a.tail;
      for (var c = null; null !== b;) null !== b.alternate && (c = b), b = b.sibling;
      null === c ? a.tail = null : c.sibling = null;
      break;
    case "collapsed":
      c = a.tail;
      for (var d = null; null !== c;) null !== c.alternate && (d = c), c = c.sibling;
      null === d ? b || null === a.tail ? a.tail = null : a.tail.sibling = null : d.sibling = null;
  }
}
function S(a) {
  var b = null !== a.alternate && a.alternate.child === a.child,
    c = 0,
    d = 0;
  if (b) for (var e = a.child; null !== e;) c |= e.lanes | e.childLanes, d |= e.subtreeFlags & 14680064, d |= e.flags & 14680064, e.return = a, e = e.sibling;else for (e = a.child; null !== e;) c |= e.lanes | e.childLanes, d |= e.subtreeFlags, d |= e.flags, e.return = a, e = e.sibling;
  a.subtreeFlags |= d;
  a.childLanes = c;
  return b;
}
function Ej(a, b, c) {
  var d = b.pendingProps;
  wg(b);
  switch (b.tag) {
    case 2:
    case 16:
    case 15:
    case 0:
    case 11:
    case 7:
    case 8:
    case 12:
    case 9:
    case 14:
      return S(b), null;
    case 1:
      return Zf(b.type) && $f(), S(b), null;
    case 3:
      d = b.stateNode;
      zh();
      E(Wf);
      E(H);
      Eh();
      d.pendingContext && (d.context = d.pendingContext, d.pendingContext = null);
      if (null === a || null === a.child) Gg(b) ? b.flags |= 4 : null === a || a.memoizedState.isDehydrated && 0 === (b.flags & 256) || (b.flags |= 1024, null !== zg && (Fj(zg), zg = null));
      Aj(a, b);
      S(b);
      return null;
    case 5:
      Bh(b);
      var e = xh(wh.current);
      c = b.type;
      if (null !== a && null != b.stateNode) Bj(a, b, c, d, e), a.ref !== b.ref && (b.flags |= 512, b.flags |= 2097152);else {
        if (!d) {
          if (null === b.stateNode) throw Error(p(166));
          S(b);
          return null;
        }
        a = xh(uh.current);
        if (Gg(b)) {
          d = b.stateNode;
          c = b.type;
          var f = b.memoizedProps;
          d[Of] = b;
          d[Pf] = f;
          a = 0 !== (b.mode & 1);
          switch (c) {
            case "dialog":
              D("cancel", d);
              D("close", d);
              break;
            case "iframe":
            case "object":
            case "embed":
              D("load", d);
              break;
            case "video":
            case "audio":
              for (e = 0; e < lf.length; e++) D(lf[e], d);
              break;
            case "source":
              D("error", d);
              break;
            case "img":
            case "image":
            case "link":
              D("error", d);
              D("load", d);
              break;
            case "details":
              D("toggle", d);
              break;
            case "input":
              Za(d, f);
              D("invalid", d);
              break;
            case "select":
              d._wrapperState = {
                wasMultiple: !!f.multiple
              };
              D("invalid", d);
              break;
            case "textarea":
              hb(d, f), D("invalid", d);
          }
          ub(c, f);
          e = null;
          for (var g in f) if (f.hasOwnProperty(g)) {
            var h = f[g];
            "children" === g ? "string" === typeof h ? d.textContent !== h && (!0 !== f.suppressHydrationWarning && Af(d.textContent, h, a), e = ["children", h]) : "number" === typeof h && d.textContent !== "" + h && (!0 !== f.suppressHydrationWarning && Af(d.textContent, h, a), e = ["children", "" + h]) : ea.hasOwnProperty(g) && null != h && "onScroll" === g && D("scroll", d);
          }
          switch (c) {
            case "input":
              Va(d);
              db(d, f, !0);
              break;
            case "textarea":
              Va(d);
              jb(d);
              break;
            case "select":
            case "option":
              break;
            default:
              "function" === typeof f.onClick && (d.onclick = Bf);
          }
          d = e;
          b.updateQueue = d;
          null !== d && (b.flags |= 4);
        } else {
          g = 9 === e.nodeType ? e : e.ownerDocument;
          "http://www.w3.org/1999/xhtml" === a && (a = kb(c));
          "http://www.w3.org/1999/xhtml" === a ? "script" === c ? (a = g.createElement("div"), a.innerHTML = "<script>\x3c/script>", a = a.removeChild(a.firstChild)) : "string" === typeof d.is ? a = g.createElement(c, {
            is: d.is
          }) : (a = g.createElement(c), "select" === c && (g = a, d.multiple ? g.multiple = !0 : d.size && (g.size = d.size))) : a = g.createElementNS(a, c);
          a[Of] = b;
          a[Pf] = d;
          zj(a, b, !1, !1);
          b.stateNode = a;
          a: {
            g = vb(c, d);
            switch (c) {
              case "dialog":
                D("cancel", a);
                D("close", a);
                e = d;
                break;
              case "iframe":
              case "object":
              case "embed":
                D("load", a);
                e = d;
                break;
              case "video":
              case "audio":
                for (e = 0; e < lf.length; e++) D(lf[e], a);
                e = d;
                break;
              case "source":
                D("error", a);
                e = d;
                break;
              case "img":
              case "image":
              case "link":
                D("error", a);
                D("load", a);
                e = d;
                break;
              case "details":
                D("toggle", a);
                e = d;
                break;
              case "input":
                Za(a, d);
                e = Ya(a, d);
                D("invalid", a);
                break;
              case "option":
                e = d;
                break;
              case "select":
                a._wrapperState = {
                  wasMultiple: !!d.multiple
                };
                e = A({}, d, {
                  value: void 0
                });
                D("invalid", a);
                break;
              case "textarea":
                hb(a, d);
                e = gb(a, d);
                D("invalid", a);
                break;
              default:
                e = d;
            }
            ub(c, e);
            h = e;
            for (f in h) if (h.hasOwnProperty(f)) {
              var k = h[f];
              "style" === f ? sb(a, k) : "dangerouslySetInnerHTML" === f ? (k = k ? k.__html : void 0, null != k && nb(a, k)) : "children" === f ? "string" === typeof k ? ("textarea" !== c || "" !== k) && ob(a, k) : "number" === typeof k && ob(a, "" + k) : "suppressContentEditableWarning" !== f && "suppressHydrationWarning" !== f && "autoFocus" !== f && (ea.hasOwnProperty(f) ? null != k && "onScroll" === f && D("scroll", a) : null != k && ta(a, f, k, g));
            }
            switch (c) {
              case "input":
                Va(a);
                db(a, d, !1);
                break;
              case "textarea":
                Va(a);
                jb(a);
                break;
              case "option":
                null != d.value && a.setAttribute("value", "" + Sa(d.value));
                break;
              case "select":
                a.multiple = !!d.multiple;
                f = d.value;
                null != f ? fb(a, !!d.multiple, f, !1) : null != d.defaultValue && fb(a, !!d.multiple, d.defaultValue, !0);
                break;
              default:
                "function" === typeof e.onClick && (a.onclick = Bf);
            }
            switch (c) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                d = !!d.autoFocus;
                break a;
              case "img":
                d = !0;
                break a;
              default:
                d = !1;
            }
          }
          d && (b.flags |= 4);
        }
        null !== b.ref && (b.flags |= 512, b.flags |= 2097152);
      }
      S(b);
      return null;
    case 6:
      if (a && null != b.stateNode) Cj(a, b, a.memoizedProps, d);else {
        if ("string" !== typeof d && null === b.stateNode) throw Error(p(166));
        c = xh(wh.current);
        xh(uh.current);
        if (Gg(b)) {
          d = b.stateNode;
          c = b.memoizedProps;
          d[Of] = b;
          if (f = d.nodeValue !== c) if (a = xg, null !== a) switch (a.tag) {
            case 3:
              Af(d.nodeValue, c, 0 !== (a.mode & 1));
              break;
            case 5:
              !0 !== a.memoizedProps.suppressHydrationWarning && Af(d.nodeValue, c, 0 !== (a.mode & 1));
          }
          f && (b.flags |= 4);
        } else d = (9 === c.nodeType ? c : c.ownerDocument).createTextNode(d), d[Of] = b, b.stateNode = d;
      }
      S(b);
      return null;
    case 13:
      E(L);
      d = b.memoizedState;
      if (null === a || null !== a.memoizedState && null !== a.memoizedState.dehydrated) {
        if (I && null !== yg && 0 !== (b.mode & 1) && 0 === (b.flags & 128)) Hg(), Ig(), b.flags |= 98560, f = !1;else if (f = Gg(b), null !== d && null !== d.dehydrated) {
          if (null === a) {
            if (!f) throw Error(p(318));
            f = b.memoizedState;
            f = null !== f ? f.dehydrated : null;
            if (!f) throw Error(p(317));
            f[Of] = b;
          } else Ig(), 0 === (b.flags & 128) && (b.memoizedState = null), b.flags |= 4;
          S(b);
          f = !1;
        } else null !== zg && (Fj(zg), zg = null), f = !0;
        if (!f) return b.flags & 65536 ? b : null;
      }
      if (0 !== (b.flags & 128)) return b.lanes = c, b;
      d = null !== d;
      d !== (null !== a && null !== a.memoizedState) && d && (b.child.flags |= 8192, 0 !== (b.mode & 1) && (null === a || 0 !== (L.current & 1) ? 0 === T && (T = 3) : tj()));
      null !== b.updateQueue && (b.flags |= 4);
      S(b);
      return null;
    case 4:
      return zh(), Aj(a, b), null === a && sf(b.stateNode.containerInfo), S(b), null;
    case 10:
      return ah(b.type._context), S(b), null;
    case 17:
      return Zf(b.type) && $f(), S(b), null;
    case 19:
      E(L);
      f = b.memoizedState;
      if (null === f) return S(b), null;
      d = 0 !== (b.flags & 128);
      g = f.rendering;
      if (null === g) {
        if (d) Dj(f, !1);else {
          if (0 !== T || null !== a && 0 !== (a.flags & 128)) for (a = b.child; null !== a;) {
            g = Ch(a);
            if (null !== g) {
              b.flags |= 128;
              Dj(f, !1);
              d = g.updateQueue;
              null !== d && (b.updateQueue = d, b.flags |= 4);
              b.subtreeFlags = 0;
              d = c;
              for (c = b.child; null !== c;) f = c, a = d, f.flags &= 14680066, g = f.alternate, null === g ? (f.childLanes = 0, f.lanes = a, f.child = null, f.subtreeFlags = 0, f.memoizedProps = null, f.memoizedState = null, f.updateQueue = null, f.dependencies = null, f.stateNode = null) : (f.childLanes = g.childLanes, f.lanes = g.lanes, f.child = g.child, f.subtreeFlags = 0, f.deletions = null, f.memoizedProps = g.memoizedProps, f.memoizedState = g.memoizedState, f.updateQueue = g.updateQueue, f.type = g.type, a = g.dependencies, f.dependencies = null === a ? null : {
                lanes: a.lanes,
                firstContext: a.firstContext
              }), c = c.sibling;
              G(L, L.current & 1 | 2);
              return b.child;
            }
            a = a.sibling;
          }
          null !== f.tail && B() > Gj && (b.flags |= 128, d = !0, Dj(f, !1), b.lanes = 4194304);
        }
      } else {
        if (!d) if (a = Ch(g), null !== a) {
          if (b.flags |= 128, d = !0, c = a.updateQueue, null !== c && (b.updateQueue = c, b.flags |= 4), Dj(f, !0), null === f.tail && "hidden" === f.tailMode && !g.alternate && !I) return S(b), null;
        } else 2 * B() - f.renderingStartTime > Gj && 1073741824 !== c && (b.flags |= 128, d = !0, Dj(f, !1), b.lanes = 4194304);
        f.isBackwards ? (g.sibling = b.child, b.child = g) : (c = f.last, null !== c ? c.sibling = g : b.child = g, f.last = g);
      }
      if (null !== f.tail) return b = f.tail, f.rendering = b, f.tail = b.sibling, f.renderingStartTime = B(), b.sibling = null, c = L.current, G(L, d ? c & 1 | 2 : c & 1), b;
      S(b);
      return null;
    case 22:
    case 23:
      return Hj(), d = null !== b.memoizedState, null !== a && null !== a.memoizedState !== d && (b.flags |= 8192), d && 0 !== (b.mode & 1) ? 0 !== (fj & 1073741824) && (S(b), b.subtreeFlags & 6 && (b.flags |= 8192)) : S(b), null;
    case 24:
      return null;
    case 25:
      return null;
  }
  throw Error(p(156, b.tag));
}
function Ij(a, b) {
  wg(b);
  switch (b.tag) {
    case 1:
      return Zf(b.type) && $f(), a = b.flags, a & 65536 ? (b.flags = a & -65537 | 128, b) : null;
    case 3:
      return zh(), E(Wf), E(H), Eh(), a = b.flags, 0 !== (a & 65536) && 0 === (a & 128) ? (b.flags = a & -65537 | 128, b) : null;
    case 5:
      return Bh(b), null;
    case 13:
      E(L);
      a = b.memoizedState;
      if (null !== a && null !== a.dehydrated) {
        if (null === b.alternate) throw Error(p(340));
        Ig();
      }
      a = b.flags;
      return a & 65536 ? (b.flags = a & -65537 | 128, b) : null;
    case 19:
      return E(L), null;
    case 4:
      return zh(), null;
    case 10:
      return ah(b.type._context), null;
    case 22:
    case 23:
      return Hj(), null;
    case 24:
      return null;
    default:
      return null;
  }
}
var Jj = !1,
  U = !1,
  Kj = "function" === typeof WeakSet ? WeakSet : Set,
  V = null;
function Lj(a, b) {
  var c = a.ref;
  if (null !== c) if ("function" === typeof c) try {
    c(null);
  } catch (d) {
    W(a, b, d);
  } else c.current = null;
}
function Mj(a, b, c) {
  try {
    c();
  } catch (d) {
    W(a, b, d);
  }
}
var Nj = !1;
function Oj(a, b) {
  Cf = dd;
  a = Me();
  if (Ne(a)) {
    if ("selectionStart" in a) var c = {
      start: a.selectionStart,
      end: a.selectionEnd
    };else a: {
      c = (c = a.ownerDocument) && c.defaultView || window;
      var d = c.getSelection && c.getSelection();
      if (d && 0 !== d.rangeCount) {
        c = d.anchorNode;
        var e = d.anchorOffset,
          f = d.focusNode;
        d = d.focusOffset;
        try {
          c.nodeType, f.nodeType;
        } catch (F) {
          c = null;
          break a;
        }
        var g = 0,
          h = -1,
          k = -1,
          l = 0,
          m = 0,
          q = a,
          r = null;
        b: for (;;) {
          for (var y;;) {
            q !== c || 0 !== e && 3 !== q.nodeType || (h = g + e);
            q !== f || 0 !== d && 3 !== q.nodeType || (k = g + d);
            3 === q.nodeType && (g += q.nodeValue.length);
            if (null === (y = q.firstChild)) break;
            r = q;
            q = y;
          }
          for (;;) {
            if (q === a) break b;
            r === c && ++l === e && (h = g);
            r === f && ++m === d && (k = g);
            if (null !== (y = q.nextSibling)) break;
            q = r;
            r = q.parentNode;
          }
          q = y;
        }
        c = -1 === h || -1 === k ? null : {
          start: h,
          end: k
        };
      } else c = null;
    }
    c = c || {
      start: 0,
      end: 0
    };
  } else c = null;
  Df = {
    focusedElem: a,
    selectionRange: c
  };
  dd = !1;
  for (V = b; null !== V;) if (b = V, a = b.child, 0 !== (b.subtreeFlags & 1028) && null !== a) a.return = b, V = a;else for (; null !== V;) {
    b = V;
    try {
      var n = b.alternate;
      if (0 !== (b.flags & 1024)) switch (b.tag) {
        case 0:
        case 11:
        case 15:
          break;
        case 1:
          if (null !== n) {
            var t = n.memoizedProps,
              J = n.memoizedState,
              x = b.stateNode,
              w = x.getSnapshotBeforeUpdate(b.elementType === b.type ? t : Ci(b.type, t), J);
            x.__reactInternalSnapshotBeforeUpdate = w;
          }
          break;
        case 3:
          var u = b.stateNode.containerInfo;
          1 === u.nodeType ? u.textContent = "" : 9 === u.nodeType && u.documentElement && u.removeChild(u.documentElement);
          break;
        case 5:
        case 6:
        case 4:
        case 17:
          break;
        default:
          throw Error(p(163));
      }
    } catch (F) {
      W(b, b.return, F);
    }
    a = b.sibling;
    if (null !== a) {
      a.return = b.return;
      V = a;
      break;
    }
    V = b.return;
  }
  n = Nj;
  Nj = !1;
  return n;
}
function Pj(a, b, c) {
  var d = b.updateQueue;
  d = null !== d ? d.lastEffect : null;
  if (null !== d) {
    var e = d = d.next;
    do {
      if ((e.tag & a) === a) {
        var f = e.destroy;
        e.destroy = void 0;
        void 0 !== f && Mj(b, c, f);
      }
      e = e.next;
    } while (e !== d);
  }
}
function Qj(a, b) {
  b = b.updateQueue;
  b = null !== b ? b.lastEffect : null;
  if (null !== b) {
    var c = b = b.next;
    do {
      if ((c.tag & a) === a) {
        var d = c.create;
        c.destroy = d();
      }
      c = c.next;
    } while (c !== b);
  }
}
function Rj(a) {
  var b = a.ref;
  if (null !== b) {
    var c = a.stateNode;
    switch (a.tag) {
      case 5:
        a = c;
        break;
      default:
        a = c;
    }
    "function" === typeof b ? b(a) : b.current = a;
  }
}
function Sj(a) {
  var b = a.alternate;
  null !== b && (a.alternate = null, Sj(b));
  a.child = null;
  a.deletions = null;
  a.sibling = null;
  5 === a.tag && (b = a.stateNode, null !== b && (delete b[Of], delete b[Pf], delete b[of], delete b[Qf], delete b[Rf]));
  a.stateNode = null;
  a.return = null;
  a.dependencies = null;
  a.memoizedProps = null;
  a.memoizedState = null;
  a.pendingProps = null;
  a.stateNode = null;
  a.updateQueue = null;
}
function Tj(a) {
  return 5 === a.tag || 3 === a.tag || 4 === a.tag;
}
function Uj(a) {
  a: for (;;) {
    for (; null === a.sibling;) {
      if (null === a.return || Tj(a.return)) return null;
      a = a.return;
    }
    a.sibling.return = a.return;
    for (a = a.sibling; 5 !== a.tag && 6 !== a.tag && 18 !== a.tag;) {
      if (a.flags & 2) continue a;
      if (null === a.child || 4 === a.tag) continue a;else a.child.return = a, a = a.child;
    }
    if (!(a.flags & 2)) return a.stateNode;
  }
}
function Vj(a, b, c) {
  var d = a.tag;
  if (5 === d || 6 === d) a = a.stateNode, b ? 8 === c.nodeType ? c.parentNode.insertBefore(a, b) : c.insertBefore(a, b) : (8 === c.nodeType ? (b = c.parentNode, b.insertBefore(a, c)) : (b = c, b.appendChild(a)), c = c._reactRootContainer, null !== c && void 0 !== c || null !== b.onclick || (b.onclick = Bf));else if (4 !== d && (a = a.child, null !== a)) for (Vj(a, b, c), a = a.sibling; null !== a;) Vj(a, b, c), a = a.sibling;
}
function Wj(a, b, c) {
  var d = a.tag;
  if (5 === d || 6 === d) a = a.stateNode, b ? c.insertBefore(a, b) : c.appendChild(a);else if (4 !== d && (a = a.child, null !== a)) for (Wj(a, b, c), a = a.sibling; null !== a;) Wj(a, b, c), a = a.sibling;
}
var X = null,
  Xj = !1;
function Yj(a, b, c) {
  for (c = c.child; null !== c;) Zj(a, b, c), c = c.sibling;
}
function Zj(a, b, c) {
  if (lc && "function" === typeof lc.onCommitFiberUnmount) try {
    lc.onCommitFiberUnmount(kc, c);
  } catch (h) {}
  switch (c.tag) {
    case 5:
      U || Lj(c, b);
    case 6:
      var d = X,
        e = Xj;
      X = null;
      Yj(a, b, c);
      X = d;
      Xj = e;
      null !== X && (Xj ? (a = X, c = c.stateNode, 8 === a.nodeType ? a.parentNode.removeChild(c) : a.removeChild(c)) : X.removeChild(c.stateNode));
      break;
    case 18:
      null !== X && (Xj ? (a = X, c = c.stateNode, 8 === a.nodeType ? Kf(a.parentNode, c) : 1 === a.nodeType && Kf(a, c), bd(a)) : Kf(X, c.stateNode));
      break;
    case 4:
      d = X;
      e = Xj;
      X = c.stateNode.containerInfo;
      Xj = !0;
      Yj(a, b, c);
      X = d;
      Xj = e;
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      if (!U && (d = c.updateQueue, null !== d && (d = d.lastEffect, null !== d))) {
        e = d = d.next;
        do {
          var f = e,
            g = f.destroy;
          f = f.tag;
          void 0 !== g && (0 !== (f & 2) ? Mj(c, b, g) : 0 !== (f & 4) && Mj(c, b, g));
          e = e.next;
        } while (e !== d);
      }
      Yj(a, b, c);
      break;
    case 1:
      if (!U && (Lj(c, b), d = c.stateNode, "function" === typeof d.componentWillUnmount)) try {
        d.props = c.memoizedProps, d.state = c.memoizedState, d.componentWillUnmount();
      } catch (h) {
        W(c, b, h);
      }
      Yj(a, b, c);
      break;
    case 21:
      Yj(a, b, c);
      break;
    case 22:
      c.mode & 1 ? (U = (d = U) || null !== c.memoizedState, Yj(a, b, c), U = d) : Yj(a, b, c);
      break;
    default:
      Yj(a, b, c);
  }
}
function ak(a) {
  var b = a.updateQueue;
  if (null !== b) {
    a.updateQueue = null;
    var c = a.stateNode;
    null === c && (c = a.stateNode = new Kj());
    b.forEach(function (b) {
      var d = bk.bind(null, a, b);
      c.has(b) || (c.add(b), b.then(d, d));
    });
  }
}
function ck(a, b) {
  var c = b.deletions;
  if (null !== c) for (var d = 0; d < c.length; d++) {
    var e = c[d];
    try {
      var f = a,
        g = b,
        h = g;
      a: for (; null !== h;) {
        switch (h.tag) {
          case 5:
            X = h.stateNode;
            Xj = !1;
            break a;
          case 3:
            X = h.stateNode.containerInfo;
            Xj = !0;
            break a;
          case 4:
            X = h.stateNode.containerInfo;
            Xj = !0;
            break a;
        }
        h = h.return;
      }
      if (null === X) throw Error(p(160));
      Zj(f, g, e);
      X = null;
      Xj = !1;
      var k = e.alternate;
      null !== k && (k.return = null);
      e.return = null;
    } catch (l) {
      W(e, b, l);
    }
  }
  if (b.subtreeFlags & 12854) for (b = b.child; null !== b;) dk(b, a), b = b.sibling;
}
function dk(a, b) {
  var c = a.alternate,
    d = a.flags;
  switch (a.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      ck(b, a);
      ek(a);
      if (d & 4) {
        try {
          Pj(3, a, a.return), Qj(3, a);
        } catch (t) {
          W(a, a.return, t);
        }
        try {
          Pj(5, a, a.return);
        } catch (t) {
          W(a, a.return, t);
        }
      }
      break;
    case 1:
      ck(b, a);
      ek(a);
      d & 512 && null !== c && Lj(c, c.return);
      break;
    case 5:
      ck(b, a);
      ek(a);
      d & 512 && null !== c && Lj(c, c.return);
      if (a.flags & 32) {
        var e = a.stateNode;
        try {
          ob(e, "");
        } catch (t) {
          W(a, a.return, t);
        }
      }
      if (d & 4 && (e = a.stateNode, null != e)) {
        var f = a.memoizedProps,
          g = null !== c ? c.memoizedProps : f,
          h = a.type,
          k = a.updateQueue;
        a.updateQueue = null;
        if (null !== k) try {
          "input" === h && "radio" === f.type && null != f.name && ab(e, f);
          vb(h, g);
          var l = vb(h, f);
          for (g = 0; g < k.length; g += 2) {
            var m = k[g],
              q = k[g + 1];
            "style" === m ? sb(e, q) : "dangerouslySetInnerHTML" === m ? nb(e, q) : "children" === m ? ob(e, q) : ta(e, m, q, l);
          }
          switch (h) {
            case "input":
              bb(e, f);
              break;
            case "textarea":
              ib(e, f);
              break;
            case "select":
              var r = e._wrapperState.wasMultiple;
              e._wrapperState.wasMultiple = !!f.multiple;
              var y = f.value;
              null != y ? fb(e, !!f.multiple, y, !1) : r !== !!f.multiple && (null != f.defaultValue ? fb(e, !!f.multiple, f.defaultValue, !0) : fb(e, !!f.multiple, f.multiple ? [] : "", !1));
          }
          e[Pf] = f;
        } catch (t) {
          W(a, a.return, t);
        }
      }
      break;
    case 6:
      ck(b, a);
      ek(a);
      if (d & 4) {
        if (null === a.stateNode) throw Error(p(162));
        e = a.stateNode;
        f = a.memoizedProps;
        try {
          e.nodeValue = f;
        } catch (t) {
          W(a, a.return, t);
        }
      }
      break;
    case 3:
      ck(b, a);
      ek(a);
      if (d & 4 && null !== c && c.memoizedState.isDehydrated) try {
        bd(b.containerInfo);
      } catch (t) {
        W(a, a.return, t);
      }
      break;
    case 4:
      ck(b, a);
      ek(a);
      break;
    case 13:
      ck(b, a);
      ek(a);
      e = a.child;
      e.flags & 8192 && (f = null !== e.memoizedState, e.stateNode.isHidden = f, !f || null !== e.alternate && null !== e.alternate.memoizedState || (fk = B()));
      d & 4 && ak(a);
      break;
    case 22:
      m = null !== c && null !== c.memoizedState;
      a.mode & 1 ? (U = (l = U) || m, ck(b, a), U = l) : ck(b, a);
      ek(a);
      if (d & 8192) {
        l = null !== a.memoizedState;
        if ((a.stateNode.isHidden = l) && !m && 0 !== (a.mode & 1)) for (V = a, m = a.child; null !== m;) {
          for (q = V = m; null !== V;) {
            r = V;
            y = r.child;
            switch (r.tag) {
              case 0:
              case 11:
              case 14:
              case 15:
                Pj(4, r, r.return);
                break;
              case 1:
                Lj(r, r.return);
                var n = r.stateNode;
                if ("function" === typeof n.componentWillUnmount) {
                  d = r;
                  c = r.return;
                  try {
                    b = d, n.props = b.memoizedProps, n.state = b.memoizedState, n.componentWillUnmount();
                  } catch (t) {
                    W(d, c, t);
                  }
                }
                break;
              case 5:
                Lj(r, r.return);
                break;
              case 22:
                if (null !== r.memoizedState) {
                  gk(q);
                  continue;
                }
            }
            null !== y ? (y.return = r, V = y) : gk(q);
          }
          m = m.sibling;
        }
        a: for (m = null, q = a;;) {
          if (5 === q.tag) {
            if (null === m) {
              m = q;
              try {
                e = q.stateNode, l ? (f = e.style, "function" === typeof f.setProperty ? f.setProperty("display", "none", "important") : f.display = "none") : (h = q.stateNode, k = q.memoizedProps.style, g = void 0 !== k && null !== k && k.hasOwnProperty("display") ? k.display : null, h.style.display = rb("display", g));
              } catch (t) {
                W(a, a.return, t);
              }
            }
          } else if (6 === q.tag) {
            if (null === m) try {
              q.stateNode.nodeValue = l ? "" : q.memoizedProps;
            } catch (t) {
              W(a, a.return, t);
            }
          } else if ((22 !== q.tag && 23 !== q.tag || null === q.memoizedState || q === a) && null !== q.child) {
            q.child.return = q;
            q = q.child;
            continue;
          }
          if (q === a) break a;
          for (; null === q.sibling;) {
            if (null === q.return || q.return === a) break a;
            m === q && (m = null);
            q = q.return;
          }
          m === q && (m = null);
          q.sibling.return = q.return;
          q = q.sibling;
        }
      }
      break;
    case 19:
      ck(b, a);
      ek(a);
      d & 4 && ak(a);
      break;
    case 21:
      break;
    default:
      ck(b, a), ek(a);
  }
}
function ek(a) {
  var b = a.flags;
  if (b & 2) {
    try {
      a: {
        for (var c = a.return; null !== c;) {
          if (Tj(c)) {
            var d = c;
            break a;
          }
          c = c.return;
        }
        throw Error(p(160));
      }
      switch (d.tag) {
        case 5:
          var e = d.stateNode;
          d.flags & 32 && (ob(e, ""), d.flags &= -33);
          var f = Uj(a);
          Wj(a, f, e);
          break;
        case 3:
        case 4:
          var g = d.stateNode.containerInfo,
            h = Uj(a);
          Vj(a, h, g);
          break;
        default:
          throw Error(p(161));
      }
    } catch (k) {
      W(a, a.return, k);
    }
    a.flags &= -3;
  }
  b & 4096 && (a.flags &= -4097);
}
function hk(a, b, c) {
  V = a;
  ik(a, b, c);
}
function ik(a, b, c) {
  for (var d = 0 !== (a.mode & 1); null !== V;) {
    var e = V,
      f = e.child;
    if (22 === e.tag && d) {
      var g = null !== e.memoizedState || Jj;
      if (!g) {
        var h = e.alternate,
          k = null !== h && null !== h.memoizedState || U;
        h = Jj;
        var l = U;
        Jj = g;
        if ((U = k) && !l) for (V = e; null !== V;) g = V, k = g.child, 22 === g.tag && null !== g.memoizedState ? jk(e) : null !== k ? (k.return = g, V = k) : jk(e);
        for (; null !== f;) V = f, ik(f, b, c), f = f.sibling;
        V = e;
        Jj = h;
        U = l;
      }
      kk(a, b, c);
    } else 0 !== (e.subtreeFlags & 8772) && null !== f ? (f.return = e, V = f) : kk(a, b, c);
  }
}
function kk(a) {
  for (; null !== V;) {
    var b = V;
    if (0 !== (b.flags & 8772)) {
      var c = b.alternate;
      try {
        if (0 !== (b.flags & 8772)) switch (b.tag) {
          case 0:
          case 11:
          case 15:
            U || Qj(5, b);
            break;
          case 1:
            var d = b.stateNode;
            if (b.flags & 4 && !U) if (null === c) d.componentDidMount();else {
              var e = b.elementType === b.type ? c.memoizedProps : Ci(b.type, c.memoizedProps);
              d.componentDidUpdate(e, c.memoizedState, d.__reactInternalSnapshotBeforeUpdate);
            }
            var f = b.updateQueue;
            null !== f && sh(b, f, d);
            break;
          case 3:
            var g = b.updateQueue;
            if (null !== g) {
              c = null;
              if (null !== b.child) switch (b.child.tag) {
                case 5:
                  c = b.child.stateNode;
                  break;
                case 1:
                  c = b.child.stateNode;
              }
              sh(b, g, c);
            }
            break;
          case 5:
            var h = b.stateNode;
            if (null === c && b.flags & 4) {
              c = h;
              var k = b.memoizedProps;
              switch (b.type) {
                case "button":
                case "input":
                case "select":
                case "textarea":
                  k.autoFocus && c.focus();
                  break;
                case "img":
                  k.src && (c.src = k.src);
              }
            }
            break;
          case 6:
            break;
          case 4:
            break;
          case 12:
            break;
          case 13:
            if (null === b.memoizedState) {
              var l = b.alternate;
              if (null !== l) {
                var m = l.memoizedState;
                if (null !== m) {
                  var q = m.dehydrated;
                  null !== q && bd(q);
                }
              }
            }
            break;
          case 19:
          case 17:
          case 21:
          case 22:
          case 23:
          case 25:
            break;
          default:
            throw Error(p(163));
        }
        U || b.flags & 512 && Rj(b);
      } catch (r) {
        W(b, b.return, r);
      }
    }
    if (b === a) {
      V = null;
      break;
    }
    c = b.sibling;
    if (null !== c) {
      c.return = b.return;
      V = c;
      break;
    }
    V = b.return;
  }
}
function gk(a) {
  for (; null !== V;) {
    var b = V;
    if (b === a) {
      V = null;
      break;
    }
    var c = b.sibling;
    if (null !== c) {
      c.return = b.return;
      V = c;
      break;
    }
    V = b.return;
  }
}
function jk(a) {
  for (; null !== V;) {
    var b = V;
    try {
      switch (b.tag) {
        case 0:
        case 11:
        case 15:
          var c = b.return;
          try {
            Qj(4, b);
          } catch (k) {
            W(b, c, k);
          }
          break;
        case 1:
          var d = b.stateNode;
          if ("function" === typeof d.componentDidMount) {
            var e = b.return;
            try {
              d.componentDidMount();
            } catch (k) {
              W(b, e, k);
            }
          }
          var f = b.return;
          try {
            Rj(b);
          } catch (k) {
            W(b, f, k);
          }
          break;
        case 5:
          var g = b.return;
          try {
            Rj(b);
          } catch (k) {
            W(b, g, k);
          }
      }
    } catch (k) {
      W(b, b.return, k);
    }
    if (b === a) {
      V = null;
      break;
    }
    var h = b.sibling;
    if (null !== h) {
      h.return = b.return;
      V = h;
      break;
    }
    V = b.return;
  }
}
var lk = Math.ceil,
  mk = ua.ReactCurrentDispatcher,
  nk = ua.ReactCurrentOwner,
  ok = ua.ReactCurrentBatchConfig,
  K = 0,
  Q = null,
  Y = null,
  Z = 0,
  fj = 0,
  ej = Uf(0),
  T = 0,
  pk = null,
  rh = 0,
  qk = 0,
  rk = 0,
  sk = null,
  tk = null,
  fk = 0,
  Gj = Infinity,
  uk = null,
  Oi = !1,
  Pi = null,
  Ri = null,
  vk = !1,
  wk = null,
  xk = 0,
  yk = 0,
  zk = null,
  Ak = -1,
  Bk = 0;
function R() {
  return 0 !== (K & 6) ? B() : -1 !== Ak ? Ak : Ak = B();
}
function yi(a) {
  if (0 === (a.mode & 1)) return 1;
  if (0 !== (K & 2) && 0 !== Z) return Z & -Z;
  if (null !== Kg.transition) return 0 === Bk && (Bk = yc()), Bk;
  a = C;
  if (0 !== a) return a;
  a = window.event;
  a = void 0 === a ? 16 : jd(a.type);
  return a;
}
function gi(a, b, c, d) {
  if (50 < yk) throw yk = 0, zk = null, Error(p(185));
  Ac(a, c, d);
  if (0 === (K & 2) || a !== Q) a === Q && (0 === (K & 2) && (qk |= c), 4 === T && Ck(a, Z)), Dk(a, d), 1 === c && 0 === K && 0 === (b.mode & 1) && (Gj = B() + 500, fg && jg());
}
function Dk(a, b) {
  var c = a.callbackNode;
  wc(a, b);
  var d = uc(a, a === Q ? Z : 0);
  if (0 === d) null !== c && bc(c), a.callbackNode = null, a.callbackPriority = 0;else if (b = d & -d, a.callbackPriority !== b) {
    null != c && bc(c);
    if (1 === b) 0 === a.tag ? ig(Ek.bind(null, a)) : hg(Ek.bind(null, a)), Jf(function () {
      0 === (K & 6) && jg();
    }), c = null;else {
      switch (Dc(d)) {
        case 1:
          c = fc;
          break;
        case 4:
          c = gc;
          break;
        case 16:
          c = hc;
          break;
        case 536870912:
          c = jc;
          break;
        default:
          c = hc;
      }
      c = Fk(c, Gk.bind(null, a));
    }
    a.callbackPriority = b;
    a.callbackNode = c;
  }
}
function Gk(a, b) {
  Ak = -1;
  Bk = 0;
  if (0 !== (K & 6)) throw Error(p(327));
  var c = a.callbackNode;
  if (Hk() && a.callbackNode !== c) return null;
  var d = uc(a, a === Q ? Z : 0);
  if (0 === d) return null;
  if (0 !== (d & 30) || 0 !== (d & a.expiredLanes) || b) b = Ik(a, d);else {
    b = d;
    var e = K;
    K |= 2;
    var f = Jk();
    if (Q !== a || Z !== b) uk = null, Gj = B() + 500, Kk(a, b);
    do try {
      Lk();
      break;
    } catch (h) {
      Mk(a, h);
    } while (1);
    $g();
    mk.current = f;
    K = e;
    null !== Y ? b = 0 : (Q = null, Z = 0, b = T);
  }
  if (0 !== b) {
    2 === b && (e = xc(a), 0 !== e && (d = e, b = Nk(a, e)));
    if (1 === b) throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
    if (6 === b) Ck(a, d);else {
      e = a.current.alternate;
      if (0 === (d & 30) && !Ok(e) && (b = Ik(a, d), 2 === b && (f = xc(a), 0 !== f && (d = f, b = Nk(a, f))), 1 === b)) throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
      a.finishedWork = e;
      a.finishedLanes = d;
      switch (b) {
        case 0:
        case 1:
          throw Error(p(345));
        case 2:
          Pk(a, tk, uk);
          break;
        case 3:
          Ck(a, d);
          if ((d & 130023424) === d && (b = fk + 500 - B(), 10 < b)) {
            if (0 !== uc(a, 0)) break;
            e = a.suspendedLanes;
            if ((e & d) !== d) {
              R();
              a.pingedLanes |= a.suspendedLanes & e;
              break;
            }
            a.timeoutHandle = Ff(Pk.bind(null, a, tk, uk), b);
            break;
          }
          Pk(a, tk, uk);
          break;
        case 4:
          Ck(a, d);
          if ((d & 4194240) === d) break;
          b = a.eventTimes;
          for (e = -1; 0 < d;) {
            var g = 31 - oc(d);
            f = 1 << g;
            g = b[g];
            g > e && (e = g);
            d &= ~f;
          }
          d = e;
          d = B() - d;
          d = (120 > d ? 120 : 480 > d ? 480 : 1080 > d ? 1080 : 1920 > d ? 1920 : 3E3 > d ? 3E3 : 4320 > d ? 4320 : 1960 * lk(d / 1960)) - d;
          if (10 < d) {
            a.timeoutHandle = Ff(Pk.bind(null, a, tk, uk), d);
            break;
          }
          Pk(a, tk, uk);
          break;
        case 5:
          Pk(a, tk, uk);
          break;
        default:
          throw Error(p(329));
      }
    }
  }
  Dk(a, B());
  return a.callbackNode === c ? Gk.bind(null, a) : null;
}
function Nk(a, b) {
  var c = sk;
  a.current.memoizedState.isDehydrated && (Kk(a, b).flags |= 256);
  a = Ik(a, b);
  2 !== a && (b = tk, tk = c, null !== b && Fj(b));
  return a;
}
function Fj(a) {
  null === tk ? tk = a : tk.push.apply(tk, a);
}
function Ok(a) {
  for (var b = a;;) {
    if (b.flags & 16384) {
      var c = b.updateQueue;
      if (null !== c && (c = c.stores, null !== c)) for (var d = 0; d < c.length; d++) {
        var e = c[d],
          f = e.getSnapshot;
        e = e.value;
        try {
          if (!He(f(), e)) return !1;
        } catch (g) {
          return !1;
        }
      }
    }
    c = b.child;
    if (b.subtreeFlags & 16384 && null !== c) c.return = b, b = c;else {
      if (b === a) break;
      for (; null === b.sibling;) {
        if (null === b.return || b.return === a) return !0;
        b = b.return;
      }
      b.sibling.return = b.return;
      b = b.sibling;
    }
  }
  return !0;
}
function Ck(a, b) {
  b &= ~rk;
  b &= ~qk;
  a.suspendedLanes |= b;
  a.pingedLanes &= ~b;
  for (a = a.expirationTimes; 0 < b;) {
    var c = 31 - oc(b),
      d = 1 << c;
    a[c] = -1;
    b &= ~d;
  }
}
function Ek(a) {
  if (0 !== (K & 6)) throw Error(p(327));
  Hk();
  var b = uc(a, 0);
  if (0 === (b & 1)) return Dk(a, B()), null;
  var c = Ik(a, b);
  if (0 !== a.tag && 2 === c) {
    var d = xc(a);
    0 !== d && (b = d, c = Nk(a, d));
  }
  if (1 === c) throw c = pk, Kk(a, 0), Ck(a, b), Dk(a, B()), c;
  if (6 === c) throw Error(p(345));
  a.finishedWork = a.current.alternate;
  a.finishedLanes = b;
  Pk(a, tk, uk);
  Dk(a, B());
  return null;
}
function Qk(a, b) {
  var c = K;
  K |= 1;
  try {
    return a(b);
  } finally {
    K = c, 0 === K && (Gj = B() + 500, fg && jg());
  }
}
function Rk(a) {
  null !== wk && 0 === wk.tag && 0 === (K & 6) && Hk();
  var b = K;
  K |= 1;
  var c = ok.transition,
    d = C;
  try {
    if (ok.transition = null, C = 1, a) return a();
  } finally {
    C = d, ok.transition = c, K = b, 0 === (K & 6) && jg();
  }
}
function Hj() {
  fj = ej.current;
  E(ej);
}
function Kk(a, b) {
  a.finishedWork = null;
  a.finishedLanes = 0;
  var c = a.timeoutHandle;
  -1 !== c && (a.timeoutHandle = -1, Gf(c));
  if (null !== Y) for (c = Y.return; null !== c;) {
    var d = c;
    wg(d);
    switch (d.tag) {
      case 1:
        d = d.type.childContextTypes;
        null !== d && void 0 !== d && $f();
        break;
      case 3:
        zh();
        E(Wf);
        E(H);
        Eh();
        break;
      case 5:
        Bh(d);
        break;
      case 4:
        zh();
        break;
      case 13:
        E(L);
        break;
      case 19:
        E(L);
        break;
      case 10:
        ah(d.type._context);
        break;
      case 22:
      case 23:
        Hj();
    }
    c = c.return;
  }
  Q = a;
  Y = a = Pg(a.current, null);
  Z = fj = b;
  T = 0;
  pk = null;
  rk = qk = rh = 0;
  tk = sk = null;
  if (null !== fh) {
    for (b = 0; b < fh.length; b++) if (c = fh[b], d = c.interleaved, null !== d) {
      c.interleaved = null;
      var e = d.next,
        f = c.pending;
      if (null !== f) {
        var g = f.next;
        f.next = e;
        d.next = g;
      }
      c.pending = d;
    }
    fh = null;
  }
  return a;
}
function Mk(a, b) {
  do {
    var c = Y;
    try {
      $g();
      Fh.current = Rh;
      if (Ih) {
        for (var d = M.memoizedState; null !== d;) {
          var e = d.queue;
          null !== e && (e.pending = null);
          d = d.next;
        }
        Ih = !1;
      }
      Hh = 0;
      O = N = M = null;
      Jh = !1;
      Kh = 0;
      nk.current = null;
      if (null === c || null === c.return) {
        T = 1;
        pk = b;
        Y = null;
        break;
      }
      a: {
        var f = a,
          g = c.return,
          h = c,
          k = b;
        b = Z;
        h.flags |= 32768;
        if (null !== k && "object" === typeof k && "function" === typeof k.then) {
          var l = k,
            m = h,
            q = m.tag;
          if (0 === (m.mode & 1) && (0 === q || 11 === q || 15 === q)) {
            var r = m.alternate;
            r ? (m.updateQueue = r.updateQueue, m.memoizedState = r.memoizedState, m.lanes = r.lanes) : (m.updateQueue = null, m.memoizedState = null);
          }
          var y = Ui(g);
          if (null !== y) {
            y.flags &= -257;
            Vi(y, g, h, f, b);
            y.mode & 1 && Si(f, l, b);
            b = y;
            k = l;
            var n = b.updateQueue;
            if (null === n) {
              var t = new Set();
              t.add(k);
              b.updateQueue = t;
            } else n.add(k);
            break a;
          } else {
            if (0 === (b & 1)) {
              Si(f, l, b);
              tj();
              break a;
            }
            k = Error(p(426));
          }
        } else if (I && h.mode & 1) {
          var J = Ui(g);
          if (null !== J) {
            0 === (J.flags & 65536) && (J.flags |= 256);
            Vi(J, g, h, f, b);
            Jg(Ji(k, h));
            break a;
          }
        }
        f = k = Ji(k, h);
        4 !== T && (T = 2);
        null === sk ? sk = [f] : sk.push(f);
        f = g;
        do {
          switch (f.tag) {
            case 3:
              f.flags |= 65536;
              b &= -b;
              f.lanes |= b;
              var x = Ni(f, k, b);
              ph(f, x);
              break a;
            case 1:
              h = k;
              var w = f.type,
                u = f.stateNode;
              if (0 === (f.flags & 128) && ("function" === typeof w.getDerivedStateFromError || null !== u && "function" === typeof u.componentDidCatch && (null === Ri || !Ri.has(u)))) {
                f.flags |= 65536;
                b &= -b;
                f.lanes |= b;
                var F = Qi(f, h, b);
                ph(f, F);
                break a;
              }
          }
          f = f.return;
        } while (null !== f);
      }
      Sk(c);
    } catch (na) {
      b = na;
      Y === c && null !== c && (Y = c = c.return);
      continue;
    }
    break;
  } while (1);
}
function Jk() {
  var a = mk.current;
  mk.current = Rh;
  return null === a ? Rh : a;
}
function tj() {
  if (0 === T || 3 === T || 2 === T) T = 4;
  null === Q || 0 === (rh & 268435455) && 0 === (qk & 268435455) || Ck(Q, Z);
}
function Ik(a, b) {
  var c = K;
  K |= 2;
  var d = Jk();
  if (Q !== a || Z !== b) uk = null, Kk(a, b);
  do try {
    Tk();
    break;
  } catch (e) {
    Mk(a, e);
  } while (1);
  $g();
  K = c;
  mk.current = d;
  if (null !== Y) throw Error(p(261));
  Q = null;
  Z = 0;
  return T;
}
function Tk() {
  for (; null !== Y;) Uk(Y);
}
function Lk() {
  for (; null !== Y && !cc();) Uk(Y);
}
function Uk(a) {
  var b = Vk(a.alternate, a, fj);
  a.memoizedProps = a.pendingProps;
  null === b ? Sk(a) : Y = b;
  nk.current = null;
}
function Sk(a) {
  var b = a;
  do {
    var c = b.alternate;
    a = b.return;
    if (0 === (b.flags & 32768)) {
      if (c = Ej(c, b, fj), null !== c) {
        Y = c;
        return;
      }
    } else {
      c = Ij(c, b);
      if (null !== c) {
        c.flags &= 32767;
        Y = c;
        return;
      }
      if (null !== a) a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null;else {
        T = 6;
        Y = null;
        return;
      }
    }
    b = b.sibling;
    if (null !== b) {
      Y = b;
      return;
    }
    Y = b = a;
  } while (null !== b);
  0 === T && (T = 5);
}
function Pk(a, b, c) {
  var d = C,
    e = ok.transition;
  try {
    ok.transition = null, C = 1, Wk(a, b, c, d);
  } finally {
    ok.transition = e, C = d;
  }
  return null;
}
function Wk(a, b, c, d) {
  do Hk(); while (null !== wk);
  if (0 !== (K & 6)) throw Error(p(327));
  c = a.finishedWork;
  var e = a.finishedLanes;
  if (null === c) return null;
  a.finishedWork = null;
  a.finishedLanes = 0;
  if (c === a.current) throw Error(p(177));
  a.callbackNode = null;
  a.callbackPriority = 0;
  var f = c.lanes | c.childLanes;
  Bc(a, f);
  a === Q && (Y = Q = null, Z = 0);
  0 === (c.subtreeFlags & 2064) && 0 === (c.flags & 2064) || vk || (vk = !0, Fk(hc, function () {
    Hk();
    return null;
  }));
  f = 0 !== (c.flags & 15990);
  if (0 !== (c.subtreeFlags & 15990) || f) {
    f = ok.transition;
    ok.transition = null;
    var g = C;
    C = 1;
    var h = K;
    K |= 4;
    nk.current = null;
    Oj(a, c);
    dk(c, a);
    Oe(Df);
    dd = !!Cf;
    Df = Cf = null;
    a.current = c;
    hk(c, a, e);
    dc();
    K = h;
    C = g;
    ok.transition = f;
  } else a.current = c;
  vk && (vk = !1, wk = a, xk = e);
  f = a.pendingLanes;
  0 === f && (Ri = null);
  mc(c.stateNode, d);
  Dk(a, B());
  if (null !== b) for (d = a.onRecoverableError, c = 0; c < b.length; c++) e = b[c], d(e.value, {
    componentStack: e.stack,
    digest: e.digest
  });
  if (Oi) throw Oi = !1, a = Pi, Pi = null, a;
  0 !== (xk & 1) && 0 !== a.tag && Hk();
  f = a.pendingLanes;
  0 !== (f & 1) ? a === zk ? yk++ : (yk = 0, zk = a) : yk = 0;
  jg();
  return null;
}
function Hk() {
  if (null !== wk) {
    var a = Dc(xk),
      b = ok.transition,
      c = C;
    try {
      ok.transition = null;
      C = 16 > a ? 16 : a;
      if (null === wk) var d = !1;else {
        a = wk;
        wk = null;
        xk = 0;
        if (0 !== (K & 6)) throw Error(p(331));
        var e = K;
        K |= 4;
        for (V = a.current; null !== V;) {
          var f = V,
            g = f.child;
          if (0 !== (V.flags & 16)) {
            var h = f.deletions;
            if (null !== h) {
              for (var k = 0; k < h.length; k++) {
                var l = h[k];
                for (V = l; null !== V;) {
                  var m = V;
                  switch (m.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Pj(8, m, f);
                  }
                  var q = m.child;
                  if (null !== q) q.return = m, V = q;else for (; null !== V;) {
                    m = V;
                    var r = m.sibling,
                      y = m.return;
                    Sj(m);
                    if (m === l) {
                      V = null;
                      break;
                    }
                    if (null !== r) {
                      r.return = y;
                      V = r;
                      break;
                    }
                    V = y;
                  }
                }
              }
              var n = f.alternate;
              if (null !== n) {
                var t = n.child;
                if (null !== t) {
                  n.child = null;
                  do {
                    var J = t.sibling;
                    t.sibling = null;
                    t = J;
                  } while (null !== t);
                }
              }
              V = f;
            }
          }
          if (0 !== (f.subtreeFlags & 2064) && null !== g) g.return = f, V = g;else b: for (; null !== V;) {
            f = V;
            if (0 !== (f.flags & 2048)) switch (f.tag) {
              case 0:
              case 11:
              case 15:
                Pj(9, f, f.return);
            }
            var x = f.sibling;
            if (null !== x) {
              x.return = f.return;
              V = x;
              break b;
            }
            V = f.return;
          }
        }
        var w = a.current;
        for (V = w; null !== V;) {
          g = V;
          var u = g.child;
          if (0 !== (g.subtreeFlags & 2064) && null !== u) u.return = g, V = u;else b: for (g = w; null !== V;) {
            h = V;
            if (0 !== (h.flags & 2048)) try {
              switch (h.tag) {
                case 0:
                case 11:
                case 15:
                  Qj(9, h);
              }
            } catch (na) {
              W(h, h.return, na);
            }
            if (h === g) {
              V = null;
              break b;
            }
            var F = h.sibling;
            if (null !== F) {
              F.return = h.return;
              V = F;
              break b;
            }
            V = h.return;
          }
        }
        K = e;
        jg();
        if (lc && "function" === typeof lc.onPostCommitFiberRoot) try {
          lc.onPostCommitFiberRoot(kc, a);
        } catch (na) {}
        d = !0;
      }
      return d;
    } finally {
      C = c, ok.transition = b;
    }
  }
  return !1;
}
function Xk(a, b, c) {
  b = Ji(c, b);
  b = Ni(a, b, 1);
  a = nh(a, b, 1);
  b = R();
  null !== a && (Ac(a, 1, b), Dk(a, b));
}
function W(a, b, c) {
  if (3 === a.tag) Xk(a, a, c);else for (; null !== b;) {
    if (3 === b.tag) {
      Xk(b, a, c);
      break;
    } else if (1 === b.tag) {
      var d = b.stateNode;
      if ("function" === typeof b.type.getDerivedStateFromError || "function" === typeof d.componentDidCatch && (null === Ri || !Ri.has(d))) {
        a = Ji(c, a);
        a = Qi(b, a, 1);
        b = nh(b, a, 1);
        a = R();
        null !== b && (Ac(b, 1, a), Dk(b, a));
        break;
      }
    }
    b = b.return;
  }
}
function Ti(a, b, c) {
  var d = a.pingCache;
  null !== d && d.delete(b);
  b = R();
  a.pingedLanes |= a.suspendedLanes & c;
  Q === a && (Z & c) === c && (4 === T || 3 === T && (Z & 130023424) === Z && 500 > B() - fk ? Kk(a, 0) : rk |= c);
  Dk(a, b);
}
function Yk(a, b) {
  0 === b && (0 === (a.mode & 1) ? b = 1 : (b = sc, sc <<= 1, 0 === (sc & 130023424) && (sc = 4194304)));
  var c = R();
  a = ih(a, b);
  null !== a && (Ac(a, b, c), Dk(a, c));
}
function uj(a) {
  var b = a.memoizedState,
    c = 0;
  null !== b && (c = b.retryLane);
  Yk(a, c);
}
function bk(a, b) {
  var c = 0;
  switch (a.tag) {
    case 13:
      var d = a.stateNode;
      var e = a.memoizedState;
      null !== e && (c = e.retryLane);
      break;
    case 19:
      d = a.stateNode;
      break;
    default:
      throw Error(p(314));
  }
  null !== d && d.delete(b);
  Yk(a, c);
}
var Vk;
Vk = function (a, b, c) {
  if (null !== a) {
    if (a.memoizedProps !== b.pendingProps || Wf.current) dh = !0;else {
      if (0 === (a.lanes & c) && 0 === (b.flags & 128)) return dh = !1, yj(a, b, c);
      dh = 0 !== (a.flags & 131072) ? !0 : !1;
    }
  } else dh = !1, I && 0 !== (b.flags & 1048576) && ug(b, ng, b.index);
  b.lanes = 0;
  switch (b.tag) {
    case 2:
      var d = b.type;
      ij(a, b);
      a = b.pendingProps;
      var e = Yf(b, H.current);
      ch(b, c);
      e = Nh(null, b, d, a, e, c);
      var f = Sh();
      b.flags |= 1;
      "object" === typeof e && null !== e && "function" === typeof e.render && void 0 === e.$$typeof ? (b.tag = 1, b.memoizedState = null, b.updateQueue = null, Zf(d) ? (f = !0, cg(b)) : f = !1, b.memoizedState = null !== e.state && void 0 !== e.state ? e.state : null, kh(b), e.updater = Ei, b.stateNode = e, e._reactInternals = b, Ii(b, d, a, c), b = jj(null, b, d, !0, f, c)) : (b.tag = 0, I && f && vg(b), Xi(null, b, e, c), b = b.child);
      return b;
    case 16:
      d = b.elementType;
      a: {
        ij(a, b);
        a = b.pendingProps;
        e = d._init;
        d = e(d._payload);
        b.type = d;
        e = b.tag = Zk(d);
        a = Ci(d, a);
        switch (e) {
          case 0:
            b = cj(null, b, d, a, c);
            break a;
          case 1:
            b = hj(null, b, d, a, c);
            break a;
          case 11:
            b = Yi(null, b, d, a, c);
            break a;
          case 14:
            b = $i(null, b, d, Ci(d.type, a), c);
            break a;
        }
        throw Error(p(306, d, ""));
      }
      return b;
    case 0:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), cj(a, b, d, e, c);
    case 1:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), hj(a, b, d, e, c);
    case 3:
      a: {
        kj(b);
        if (null === a) throw Error(p(387));
        d = b.pendingProps;
        f = b.memoizedState;
        e = f.element;
        lh(a, b);
        qh(b, d, null, c);
        var g = b.memoizedState;
        d = g.element;
        if (f.isDehydrated) {
          if (f = {
            element: d,
            isDehydrated: !1,
            cache: g.cache,
            pendingSuspenseBoundaries: g.pendingSuspenseBoundaries,
            transitions: g.transitions
          }, b.updateQueue.baseState = f, b.memoizedState = f, b.flags & 256) {
            e = Ji(Error(p(423)), b);
            b = lj(a, b, d, c, e);
            break a;
          } else if (d !== e) {
            e = Ji(Error(p(424)), b);
            b = lj(a, b, d, c, e);
            break a;
          } else for (yg = Lf(b.stateNode.containerInfo.firstChild), xg = b, I = !0, zg = null, c = Vg(b, null, d, c), b.child = c; c;) c.flags = c.flags & -3 | 4096, c = c.sibling;
        } else {
          Ig();
          if (d === e) {
            b = Zi(a, b, c);
            break a;
          }
          Xi(a, b, d, c);
        }
        b = b.child;
      }
      return b;
    case 5:
      return Ah(b), null === a && Eg(b), d = b.type, e = b.pendingProps, f = null !== a ? a.memoizedProps : null, g = e.children, Ef(d, e) ? g = null : null !== f && Ef(d, f) && (b.flags |= 32), gj(a, b), Xi(a, b, g, c), b.child;
    case 6:
      return null === a && Eg(b), null;
    case 13:
      return oj(a, b, c);
    case 4:
      return yh(b, b.stateNode.containerInfo), d = b.pendingProps, null === a ? b.child = Ug(b, null, d, c) : Xi(a, b, d, c), b.child;
    case 11:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), Yi(a, b, d, e, c);
    case 7:
      return Xi(a, b, b.pendingProps, c), b.child;
    case 8:
      return Xi(a, b, b.pendingProps.children, c), b.child;
    case 12:
      return Xi(a, b, b.pendingProps.children, c), b.child;
    case 10:
      a: {
        d = b.type._context;
        e = b.pendingProps;
        f = b.memoizedProps;
        g = e.value;
        G(Wg, d._currentValue);
        d._currentValue = g;
        if (null !== f) if (He(f.value, g)) {
          if (f.children === e.children && !Wf.current) {
            b = Zi(a, b, c);
            break a;
          }
        } else for (f = b.child, null !== f && (f.return = b); null !== f;) {
          var h = f.dependencies;
          if (null !== h) {
            g = f.child;
            for (var k = h.firstContext; null !== k;) {
              if (k.context === d) {
                if (1 === f.tag) {
                  k = mh(-1, c & -c);
                  k.tag = 2;
                  var l = f.updateQueue;
                  if (null !== l) {
                    l = l.shared;
                    var m = l.pending;
                    null === m ? k.next = k : (k.next = m.next, m.next = k);
                    l.pending = k;
                  }
                }
                f.lanes |= c;
                k = f.alternate;
                null !== k && (k.lanes |= c);
                bh(f.return, c, b);
                h.lanes |= c;
                break;
              }
              k = k.next;
            }
          } else if (10 === f.tag) g = f.type === b.type ? null : f.child;else if (18 === f.tag) {
            g = f.return;
            if (null === g) throw Error(p(341));
            g.lanes |= c;
            h = g.alternate;
            null !== h && (h.lanes |= c);
            bh(g, c, b);
            g = f.sibling;
          } else g = f.child;
          if (null !== g) g.return = f;else for (g = f; null !== g;) {
            if (g === b) {
              g = null;
              break;
            }
            f = g.sibling;
            if (null !== f) {
              f.return = g.return;
              g = f;
              break;
            }
            g = g.return;
          }
          f = g;
        }
        Xi(a, b, e.children, c);
        b = b.child;
      }
      return b;
    case 9:
      return e = b.type, d = b.pendingProps.children, ch(b, c), e = eh(e), d = d(e), b.flags |= 1, Xi(a, b, d, c), b.child;
    case 14:
      return d = b.type, e = Ci(d, b.pendingProps), e = Ci(d.type, e), $i(a, b, d, e, c);
    case 15:
      return bj(a, b, b.type, b.pendingProps, c);
    case 17:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), ij(a, b), b.tag = 1, Zf(d) ? (a = !0, cg(b)) : a = !1, ch(b, c), Gi(b, d, e), Ii(b, d, e, c), jj(null, b, d, !0, a, c);
    case 19:
      return xj(a, b, c);
    case 22:
      return dj(a, b, c);
  }
  throw Error(p(156, b.tag));
};
function Fk(a, b) {
  return ac(a, b);
}
function $k(a, b, c, d) {
  this.tag = a;
  this.key = c;
  this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null;
  this.index = 0;
  this.ref = null;
  this.pendingProps = b;
  this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null;
  this.mode = d;
  this.subtreeFlags = this.flags = 0;
  this.deletions = null;
  this.childLanes = this.lanes = 0;
  this.alternate = null;
}
function Bg(a, b, c, d) {
  return new $k(a, b, c, d);
}
function aj(a) {
  a = a.prototype;
  return !(!a || !a.isReactComponent);
}
function Zk(a) {
  if ("function" === typeof a) return aj(a) ? 1 : 0;
  if (void 0 !== a && null !== a) {
    a = a.$$typeof;
    if (a === Da) return 11;
    if (a === Ga) return 14;
  }
  return 2;
}
function Pg(a, b) {
  var c = a.alternate;
  null === c ? (c = Bg(a.tag, b, a.key, a.mode), c.elementType = a.elementType, c.type = a.type, c.stateNode = a.stateNode, c.alternate = a, a.alternate = c) : (c.pendingProps = b, c.type = a.type, c.flags = 0, c.subtreeFlags = 0, c.deletions = null);
  c.flags = a.flags & 14680064;
  c.childLanes = a.childLanes;
  c.lanes = a.lanes;
  c.child = a.child;
  c.memoizedProps = a.memoizedProps;
  c.memoizedState = a.memoizedState;
  c.updateQueue = a.updateQueue;
  b = a.dependencies;
  c.dependencies = null === b ? null : {
    lanes: b.lanes,
    firstContext: b.firstContext
  };
  c.sibling = a.sibling;
  c.index = a.index;
  c.ref = a.ref;
  return c;
}
function Rg(a, b, c, d, e, f) {
  var g = 2;
  d = a;
  if ("function" === typeof a) aj(a) && (g = 1);else if ("string" === typeof a) g = 5;else a: switch (a) {
    case ya:
      return Tg(c.children, e, f, b);
    case za:
      g = 8;
      e |= 8;
      break;
    case Aa:
      return a = Bg(12, c, b, e | 2), a.elementType = Aa, a.lanes = f, a;
    case Ea:
      return a = Bg(13, c, b, e), a.elementType = Ea, a.lanes = f, a;
    case Fa:
      return a = Bg(19, c, b, e), a.elementType = Fa, a.lanes = f, a;
    case Ia:
      return pj(c, e, f, b);
    default:
      if ("object" === typeof a && null !== a) switch (a.$$typeof) {
        case Ba:
          g = 10;
          break a;
        case Ca:
          g = 9;
          break a;
        case Da:
          g = 11;
          break a;
        case Ga:
          g = 14;
          break a;
        case Ha:
          g = 16;
          d = null;
          break a;
      }
      throw Error(p(130, null == a ? a : typeof a, ""));
  }
  b = Bg(g, c, b, e);
  b.elementType = a;
  b.type = d;
  b.lanes = f;
  return b;
}
function Tg(a, b, c, d) {
  a = Bg(7, a, d, b);
  a.lanes = c;
  return a;
}
function pj(a, b, c, d) {
  a = Bg(22, a, d, b);
  a.elementType = Ia;
  a.lanes = c;
  a.stateNode = {
    isHidden: !1
  };
  return a;
}
function Qg(a, b, c) {
  a = Bg(6, a, null, b);
  a.lanes = c;
  return a;
}
function Sg(a, b, c) {
  b = Bg(4, null !== a.children ? a.children : [], a.key, b);
  b.lanes = c;
  b.stateNode = {
    containerInfo: a.containerInfo,
    pendingChildren: null,
    implementation: a.implementation
  };
  return b;
}
function al(a, b, c, d, e) {
  this.tag = b;
  this.containerInfo = a;
  this.finishedWork = this.pingCache = this.current = this.pendingChildren = null;
  this.timeoutHandle = -1;
  this.callbackNode = this.pendingContext = this.context = null;
  this.callbackPriority = 0;
  this.eventTimes = zc(0);
  this.expirationTimes = zc(-1);
  this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0;
  this.entanglements = zc(0);
  this.identifierPrefix = d;
  this.onRecoverableError = e;
  this.mutableSourceEagerHydrationData = null;
}
function bl(a, b, c, d, e, f, g, h, k) {
  a = new al(a, b, c, h, k);
  1 === b ? (b = 1, !0 === f && (b |= 8)) : b = 0;
  f = Bg(3, null, null, b);
  a.current = f;
  f.stateNode = a;
  f.memoizedState = {
    element: d,
    isDehydrated: c,
    cache: null,
    transitions: null,
    pendingSuspenseBoundaries: null
  };
  kh(f);
  return a;
}
function cl(a, b, c) {
  var d = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
  return {
    $$typeof: wa,
    key: null == d ? null : "" + d,
    children: a,
    containerInfo: b,
    implementation: c
  };
}
function dl(a) {
  if (!a) return Vf;
  a = a._reactInternals;
  a: {
    if (Vb(a) !== a || 1 !== a.tag) throw Error(p(170));
    var b = a;
    do {
      switch (b.tag) {
        case 3:
          b = b.stateNode.context;
          break a;
        case 1:
          if (Zf(b.type)) {
            b = b.stateNode.__reactInternalMemoizedMergedChildContext;
            break a;
          }
      }
      b = b.return;
    } while (null !== b);
    throw Error(p(171));
  }
  if (1 === a.tag) {
    var c = a.type;
    if (Zf(c)) return bg(a, c, b);
  }
  return b;
}
function el(a, b, c, d, e, f, g, h, k) {
  a = bl(c, d, !0, a, e, f, g, h, k);
  a.context = dl(null);
  c = a.current;
  d = R();
  e = yi(c);
  f = mh(d, e);
  f.callback = void 0 !== b && null !== b ? b : null;
  nh(c, f, e);
  a.current.lanes = e;
  Ac(a, e, d);
  Dk(a, d);
  return a;
}
function fl(a, b, c, d) {
  var e = b.current,
    f = R(),
    g = yi(e);
  c = dl(c);
  null === b.context ? b.context = c : b.pendingContext = c;
  b = mh(f, g);
  b.payload = {
    element: a
  };
  d = void 0 === d ? null : d;
  null !== d && (b.callback = d);
  a = nh(e, b, g);
  null !== a && (gi(a, e, g, f), oh(a, e, g));
  return g;
}
function gl(a) {
  a = a.current;
  if (!a.child) return null;
  switch (a.child.tag) {
    case 5:
      return a.child.stateNode;
    default:
      return a.child.stateNode;
  }
}
function hl(a, b) {
  a = a.memoizedState;
  if (null !== a && null !== a.dehydrated) {
    var c = a.retryLane;
    a.retryLane = 0 !== c && c < b ? c : b;
  }
}
function il(a, b) {
  hl(a, b);
  (a = a.alternate) && hl(a, b);
}
function jl() {
  return null;
}
var kl = "function" === typeof reportError ? reportError : function (a) {
  console.error(a);
};
function ll(a) {
  this._internalRoot = a;
}
ml.prototype.render = ll.prototype.render = function (a) {
  var b = this._internalRoot;
  if (null === b) throw Error(p(409));
  fl(a, b, null, null);
};
ml.prototype.unmount = ll.prototype.unmount = function () {
  var a = this._internalRoot;
  if (null !== a) {
    this._internalRoot = null;
    var b = a.containerInfo;
    Rk(function () {
      fl(null, a, null, null);
    });
    b[uf] = null;
  }
};
function ml(a) {
  this._internalRoot = a;
}
ml.prototype.unstable_scheduleHydration = function (a) {
  if (a) {
    var b = Hc();
    a = {
      blockedOn: null,
      target: a,
      priority: b
    };
    for (var c = 0; c < Qc.length && 0 !== b && b < Qc[c].priority; c++);
    Qc.splice(c, 0, a);
    0 === c && Vc(a);
  }
};
function nl(a) {
  return !(!a || 1 !== a.nodeType && 9 !== a.nodeType && 11 !== a.nodeType);
}
function ol(a) {
  return !(!a || 1 !== a.nodeType && 9 !== a.nodeType && 11 !== a.nodeType && (8 !== a.nodeType || " react-mount-point-unstable " !== a.nodeValue));
}
function pl() {}
function ql(a, b, c, d, e) {
  if (e) {
    if ("function" === typeof d) {
      var f = d;
      d = function () {
        var a = gl(g);
        f.call(a);
      };
    }
    var g = el(b, d, a, 0, null, !1, !1, "", pl);
    a._reactRootContainer = g;
    a[uf] = g.current;
    sf(8 === a.nodeType ? a.parentNode : a);
    Rk();
    return g;
  }
  for (; e = a.lastChild;) a.removeChild(e);
  if ("function" === typeof d) {
    var h = d;
    d = function () {
      var a = gl(k);
      h.call(a);
    };
  }
  var k = bl(a, 0, !1, null, null, !1, !1, "", pl);
  a._reactRootContainer = k;
  a[uf] = k.current;
  sf(8 === a.nodeType ? a.parentNode : a);
  Rk(function () {
    fl(b, k, c, d);
  });
  return k;
}
function rl(a, b, c, d, e) {
  var f = c._reactRootContainer;
  if (f) {
    var g = f;
    if ("function" === typeof e) {
      var h = e;
      e = function () {
        var a = gl(g);
        h.call(a);
      };
    }
    fl(b, g, a, e);
  } else g = ql(c, b, a, e, d);
  return gl(g);
}
Ec = function (a) {
  switch (a.tag) {
    case 3:
      var b = a.stateNode;
      if (b.current.memoizedState.isDehydrated) {
        var c = tc(b.pendingLanes);
        0 !== c && (Cc(b, c | 1), Dk(b, B()), 0 === (K & 6) && (Gj = B() + 500, jg()));
      }
      break;
    case 13:
      Rk(function () {
        var b = ih(a, 1);
        if (null !== b) {
          var c = R();
          gi(b, a, 1, c);
        }
      }), il(a, 1);
  }
};
Fc = function (a) {
  if (13 === a.tag) {
    var b = ih(a, 134217728);
    if (null !== b) {
      var c = R();
      gi(b, a, 134217728, c);
    }
    il(a, 134217728);
  }
};
Gc = function (a) {
  if (13 === a.tag) {
    var b = yi(a),
      c = ih(a, b);
    if (null !== c) {
      var d = R();
      gi(c, a, b, d);
    }
    il(a, b);
  }
};
Hc = function () {
  return C;
};
Ic = function (a, b) {
  var c = C;
  try {
    return C = a, b();
  } finally {
    C = c;
  }
};
yb = function (a, b, c) {
  switch (b) {
    case "input":
      bb(a, c);
      b = c.name;
      if ("radio" === c.type && null != b) {
        for (c = a; c.parentNode;) c = c.parentNode;
        c = c.querySelectorAll("input[name=" + JSON.stringify("" + b) + '][type="radio"]');
        for (b = 0; b < c.length; b++) {
          var d = c[b];
          if (d !== a && d.form === a.form) {
            var e = Db(d);
            if (!e) throw Error(p(90));
            Wa(d);
            bb(d, e);
          }
        }
      }
      break;
    case "textarea":
      ib(a, c);
      break;
    case "select":
      b = c.value, null != b && fb(a, !!c.multiple, b, !1);
  }
};
Gb = Qk;
Hb = Rk;
var sl = {
    usingClientEntryPoint: !1,
    Events: [Cb, ue, Db, Eb, Fb, Qk]
  },
  tl = {
    findFiberByHostInstance: Wc,
    bundleType: 0,
    version: "18.3.1",
    rendererPackageName: "react-dom"
  };
var ul = {
  bundleType: tl.bundleType,
  version: tl.version,
  rendererPackageName: tl.rendererPackageName,
  rendererConfig: tl.rendererConfig,
  overrideHookState: null,
  overrideHookStateDeletePath: null,
  overrideHookStateRenamePath: null,
  overrideProps: null,
  overridePropsDeletePath: null,
  overridePropsRenamePath: null,
  setErrorHandler: null,
  setSuspenseHandler: null,
  scheduleUpdate: null,
  currentDispatcherRef: ua.ReactCurrentDispatcher,
  findHostInstanceByFiber: function (a) {
    a = Zb(a);
    return null === a ? null : a.stateNode;
  },
  findFiberByHostInstance: tl.findFiberByHostInstance || jl,
  findHostInstancesForRefresh: null,
  scheduleRefresh: null,
  scheduleRoot: null,
  setRefreshHandler: null,
  getCurrentFiber: null,
  reconcilerVersion: "18.3.1-next-f1338f8080-20240426"
};
if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
  var vl = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!vl.isDisabled && vl.supportsFiber) try {
    kc = vl.inject(ul), lc = vl;
  } catch (a) {}
}
exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = sl;
exports.createPortal = function (a, b) {
  var c = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
  if (!nl(b)) throw Error(p(200));
  return cl(a, b, null, c);
};
exports.createRoot = function (a, b) {
  if (!nl(a)) throw Error(p(299));
  var c = !1,
    d = "",
    e = kl;
  null !== b && void 0 !== b && (!0 === b.unstable_strictMode && (c = !0), void 0 !== b.identifierPrefix && (d = b.identifierPrefix), void 0 !== b.onRecoverableError && (e = b.onRecoverableError));
  b = bl(a, 1, !1, null, null, c, !1, d, e);
  a[uf] = b.current;
  sf(8 === a.nodeType ? a.parentNode : a);
  return new ll(b);
};
exports.findDOMNode = function (a) {
  if (null == a) return null;
  if (1 === a.nodeType) return a;
  var b = a._reactInternals;
  if (void 0 === b) {
    if ("function" === typeof a.render) throw Error(p(188));
    a = Object.keys(a).join(",");
    throw Error(p(268, a));
  }
  a = Zb(b);
  a = null === a ? null : a.stateNode;
  return a;
};
exports.flushSync = function (a) {
  return Rk(a);
};
exports.hydrate = function (a, b, c) {
  if (!ol(b)) throw Error(p(200));
  return rl(null, a, b, !0, c);
};
exports.hydrateRoot = function (a, b, c) {
  if (!nl(a)) throw Error(p(405));
  var d = null != c && c.hydratedSources || null,
    e = !1,
    f = "",
    g = kl;
  null !== c && void 0 !== c && (!0 === c.unstable_strictMode && (e = !0), void 0 !== c.identifierPrefix && (f = c.identifierPrefix), void 0 !== c.onRecoverableError && (g = c.onRecoverableError));
  b = el(b, null, a, 1, null != c ? c : null, e, !1, f, g);
  a[uf] = b.current;
  sf(a);
  if (d) for (a = 0; a < d.length; a++) c = d[a], e = c._getVersion, e = e(c._source), null == b.mutableSourceEagerHydrationData ? b.mutableSourceEagerHydrationData = [c, e] : b.mutableSourceEagerHydrationData.push(c, e);
  return new ml(b);
};
exports.render = function (a, b, c) {
  if (!ol(b)) throw Error(p(200));
  return rl(null, a, b, !1, c);
};
exports.unmountComponentAtNode = function (a) {
  if (!ol(a)) throw Error(p(40));
  return a._reactRootContainer ? (Rk(function () {
    rl(null, null, a, !1, function () {
      a._reactRootContainer = null;
      a[uf] = null;
    });
  }), !0) : !1;
};
exports.unstable_batchedUpdates = Qk;
exports.unstable_renderSubtreeIntoContainer = function (a, b, c, d) {
  if (!ol(c)) throw Error(p(200));
  if (null == a || void 0 === a._reactInternals) throw Error(p(38));
  return rl(a, b, c, !1, d);
};
exports.version = "18.3.1-next-f1338f8080-20240426";

/***/ }),

/***/ 391:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var m = __webpack_require__(950);
if (true) {
  exports.createRoot = m.createRoot;
  exports.hydrateRoot = m.hydrateRoot;
} else { var i; }

/***/ }),

/***/ 950:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


function checkDCE() {
  /* global __REACT_DEVTOOLS_GLOBAL_HOOK__ */
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined' || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== 'function') {
    return;
  }
  if (false) {}
  try {
    // Verify that the code above has been dead code eliminated (DCE'd).
    __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
  } catch (err) {
    // DevTools shouldn't crash React, no matter what.
    // We should still report in case we break this code.
    console.error(err);
  }
}
if (true) {
  // DCE check should happen before ReactDOM bundle executes so that
  // DevTools can report bad minification during injection.
  checkDCE();
  module.exports = __webpack_require__(730);
} else {}

/***/ }),

/***/ 153:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";
var __webpack_unused_export__;
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


var f = __webpack_require__(43),
  k = Symbol.for("react.element"),
  l = Symbol.for("react.fragment"),
  m = Object.prototype.hasOwnProperty,
  n = f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,
  p = {
    key: !0,
    ref: !0,
    __self: !0,
    __source: !0
  };
function q(c, a, g) {
  var b,
    d = {},
    e = null,
    h = null;
  void 0 !== g && (e = "" + g);
  void 0 !== a.key && (e = "" + a.key);
  void 0 !== a.ref && (h = a.ref);
  for (b in a) m.call(a, b) && !p.hasOwnProperty(b) && (d[b] = a[b]);
  if (c && c.defaultProps) for (b in a = c.defaultProps, a) void 0 === d[b] && (d[b] = a[b]);
  return {
    $$typeof: k,
    type: c,
    key: e,
    ref: h,
    props: d,
    _owner: n.current
  };
}
__webpack_unused_export__ = l;
exports.jsx = q;
exports.jsxs = q;

/***/ }),

/***/ 202:
/***/ ((__unused_webpack_module, exports) => {

"use strict";
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


var l = Symbol.for("react.element"),
  n = Symbol.for("react.portal"),
  p = Symbol.for("react.fragment"),
  q = Symbol.for("react.strict_mode"),
  r = Symbol.for("react.profiler"),
  t = Symbol.for("react.provider"),
  u = Symbol.for("react.context"),
  v = Symbol.for("react.forward_ref"),
  w = Symbol.for("react.suspense"),
  x = Symbol.for("react.memo"),
  y = Symbol.for("react.lazy"),
  z = Symbol.iterator;
function A(a) {
  if (null === a || "object" !== typeof a) return null;
  a = z && a[z] || a["@@iterator"];
  return "function" === typeof a ? a : null;
}
var B = {
    isMounted: function () {
      return !1;
    },
    enqueueForceUpdate: function () {},
    enqueueReplaceState: function () {},
    enqueueSetState: function () {}
  },
  C = Object.assign,
  D = {};
function E(a, b, e) {
  this.props = a;
  this.context = b;
  this.refs = D;
  this.updater = e || B;
}
E.prototype.isReactComponent = {};
E.prototype.setState = function (a, b) {
  if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
  this.updater.enqueueSetState(this, a, b, "setState");
};
E.prototype.forceUpdate = function (a) {
  this.updater.enqueueForceUpdate(this, a, "forceUpdate");
};
function F() {}
F.prototype = E.prototype;
function G(a, b, e) {
  this.props = a;
  this.context = b;
  this.refs = D;
  this.updater = e || B;
}
var H = G.prototype = new F();
H.constructor = G;
C(H, E.prototype);
H.isPureReactComponent = !0;
var I = Array.isArray,
  J = Object.prototype.hasOwnProperty,
  K = {
    current: null
  },
  L = {
    key: !0,
    ref: !0,
    __self: !0,
    __source: !0
  };
function M(a, b, e) {
  var d,
    c = {},
    k = null,
    h = null;
  if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k = "" + b.key), b) J.call(b, d) && !L.hasOwnProperty(d) && (c[d] = b[d]);
  var g = arguments.length - 2;
  if (1 === g) c.children = e;else if (1 < g) {
    for (var f = Array(g), m = 0; m < g; m++) f[m] = arguments[m + 2];
    c.children = f;
  }
  if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
  return {
    $$typeof: l,
    type: a,
    key: k,
    ref: h,
    props: c,
    _owner: K.current
  };
}
function N(a, b) {
  return {
    $$typeof: l,
    type: a.type,
    key: b,
    ref: a.ref,
    props: a.props,
    _owner: a._owner
  };
}
function O(a) {
  return "object" === typeof a && null !== a && a.$$typeof === l;
}
function escape(a) {
  var b = {
    "=": "=0",
    ":": "=2"
  };
  return "$" + a.replace(/[=:]/g, function (a) {
    return b[a];
  });
}
var P = /\/+/g;
function Q(a, b) {
  return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
}
function R(a, b, e, d, c) {
  var k = typeof a;
  if ("undefined" === k || "boolean" === k) a = null;
  var h = !1;
  if (null === a) h = !0;else switch (k) {
    case "string":
    case "number":
      h = !0;
      break;
    case "object":
      switch (a.$$typeof) {
        case l:
        case n:
          h = !0;
      }
  }
  if (h) return h = a, c = c(h), a = "" === d ? "." + Q(h, 0) : d, I(c) ? (e = "", null != a && (e = a.replace(P, "$&/") + "/"), R(c, b, e, "", function (a) {
    return a;
  })) : null != c && (O(c) && (c = N(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P, "$&/") + "/") + a)), b.push(c)), 1;
  h = 0;
  d = "" === d ? "." : d + ":";
  if (I(a)) for (var g = 0; g < a.length; g++) {
    k = a[g];
    var f = d + Q(k, g);
    h += R(k, b, e, f, c);
  } else if (f = A(a), "function" === typeof f) for (a = f.call(a), g = 0; !(k = a.next()).done;) k = k.value, f = d + Q(k, g++), h += R(k, b, e, f, c);else if ("object" === k) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
  return h;
}
function S(a, b, e) {
  if (null == a) return a;
  var d = [],
    c = 0;
  R(a, d, "", "", function (a) {
    return b.call(e, a, c++);
  });
  return d;
}
function T(a) {
  if (-1 === a._status) {
    var b = a._result;
    b = b();
    b.then(function (b) {
      if (0 === a._status || -1 === a._status) a._status = 1, a._result = b;
    }, function (b) {
      if (0 === a._status || -1 === a._status) a._status = 2, a._result = b;
    });
    -1 === a._status && (a._status = 0, a._result = b);
  }
  if (1 === a._status) return a._result.default;
  throw a._result;
}
var U = {
    current: null
  },
  V = {
    transition: null
  },
  W = {
    ReactCurrentDispatcher: U,
    ReactCurrentBatchConfig: V,
    ReactCurrentOwner: K
  };
function X() {
  throw Error("act(...) is not supported in production builds of React.");
}
exports.Children = {
  map: S,
  forEach: function (a, b, e) {
    S(a, function () {
      b.apply(this, arguments);
    }, e);
  },
  count: function (a) {
    var b = 0;
    S(a, function () {
      b++;
    });
    return b;
  },
  toArray: function (a) {
    return S(a, function (a) {
      return a;
    }) || [];
  },
  only: function (a) {
    if (!O(a)) throw Error("React.Children.only expected to receive a single React element child.");
    return a;
  }
};
exports.Component = E;
exports.Fragment = p;
exports.Profiler = r;
exports.PureComponent = G;
exports.StrictMode = q;
exports.Suspense = w;
exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W;
exports.act = X;
exports.cloneElement = function (a, b, e) {
  if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
  var d = C({}, a.props),
    c = a.key,
    k = a.ref,
    h = a._owner;
  if (null != b) {
    void 0 !== b.ref && (k = b.ref, h = K.current);
    void 0 !== b.key && (c = "" + b.key);
    if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
    for (f in b) J.call(b, f) && !L.hasOwnProperty(f) && (d[f] = void 0 === b[f] && void 0 !== g ? g[f] : b[f]);
  }
  var f = arguments.length - 2;
  if (1 === f) d.children = e;else if (1 < f) {
    g = Array(f);
    for (var m = 0; m < f; m++) g[m] = arguments[m + 2];
    d.children = g;
  }
  return {
    $$typeof: l,
    type: a.type,
    key: c,
    ref: k,
    props: d,
    _owner: h
  };
};
exports.createContext = function (a) {
  a = {
    $$typeof: u,
    _currentValue: a,
    _currentValue2: a,
    _threadCount: 0,
    Provider: null,
    Consumer: null,
    _defaultValue: null,
    _globalName: null
  };
  a.Provider = {
    $$typeof: t,
    _context: a
  };
  return a.Consumer = a;
};
exports.createElement = M;
exports.createFactory = function (a) {
  var b = M.bind(null, a);
  b.type = a;
  return b;
};
exports.createRef = function () {
  return {
    current: null
  };
};
exports.forwardRef = function (a) {
  return {
    $$typeof: v,
    render: a
  };
};
exports.isValidElement = O;
exports.lazy = function (a) {
  return {
    $$typeof: y,
    _payload: {
      _status: -1,
      _result: a
    },
    _init: T
  };
};
exports.memo = function (a, b) {
  return {
    $$typeof: x,
    type: a,
    compare: void 0 === b ? null : b
  };
};
exports.startTransition = function (a) {
  var b = V.transition;
  V.transition = {};
  try {
    a();
  } finally {
    V.transition = b;
  }
};
exports.unstable_act = X;
exports.useCallback = function (a, b) {
  return U.current.useCallback(a, b);
};
exports.useContext = function (a) {
  return U.current.useContext(a);
};
exports.useDebugValue = function () {};
exports.useDeferredValue = function (a) {
  return U.current.useDeferredValue(a);
};
exports.useEffect = function (a, b) {
  return U.current.useEffect(a, b);
};
exports.useId = function () {
  return U.current.useId();
};
exports.useImperativeHandle = function (a, b, e) {
  return U.current.useImperativeHandle(a, b, e);
};
exports.useInsertionEffect = function (a, b) {
  return U.current.useInsertionEffect(a, b);
};
exports.useLayoutEffect = function (a, b) {
  return U.current.useLayoutEffect(a, b);
};
exports.useMemo = function (a, b) {
  return U.current.useMemo(a, b);
};
exports.useReducer = function (a, b, e) {
  return U.current.useReducer(a, b, e);
};
exports.useRef = function (a) {
  return U.current.useRef(a);
};
exports.useState = function (a) {
  return U.current.useState(a);
};
exports.useSyncExternalStore = function (a, b, e) {
  return U.current.useSyncExternalStore(a, b, e);
};
exports.useTransition = function () {
  return U.current.useTransition();
};
exports.version = "18.3.1";

/***/ }),

/***/ 43:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


if (true) {
  module.exports = __webpack_require__(202);
} else {}

/***/ }),

/***/ 579:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


if (true) {
  module.exports = __webpack_require__(153);
} else {}

/***/ }),

/***/ 234:
/***/ ((__unused_webpack_module, exports) => {

"use strict";
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


function f(a, b) {
  var c = a.length;
  a.push(b);
  a: for (; 0 < c;) {
    var d = c - 1 >>> 1,
      e = a[d];
    if (0 < g(e, b)) a[d] = b, a[c] = e, c = d;else break a;
  }
}
function h(a) {
  return 0 === a.length ? null : a[0];
}
function k(a) {
  if (0 === a.length) return null;
  var b = a[0],
    c = a.pop();
  if (c !== b) {
    a[0] = c;
    a: for (var d = 0, e = a.length, w = e >>> 1; d < w;) {
      var m = 2 * (d + 1) - 1,
        C = a[m],
        n = m + 1,
        x = a[n];
      if (0 > g(C, c)) n < e && 0 > g(x, C) ? (a[d] = x, a[n] = c, d = n) : (a[d] = C, a[m] = c, d = m);else if (n < e && 0 > g(x, c)) a[d] = x, a[n] = c, d = n;else break a;
    }
  }
  return b;
}
function g(a, b) {
  var c = a.sortIndex - b.sortIndex;
  return 0 !== c ? c : a.id - b.id;
}
if ("object" === typeof performance && "function" === typeof performance.now) {
  var l = performance;
  exports.unstable_now = function () {
    return l.now();
  };
} else {
  var p = Date,
    q = p.now();
  exports.unstable_now = function () {
    return p.now() - q;
  };
}
var r = [],
  t = [],
  u = 1,
  v = null,
  y = 3,
  z = !1,
  A = !1,
  B = !1,
  D = "function" === typeof setTimeout ? setTimeout : null,
  E = "function" === typeof clearTimeout ? clearTimeout : null,
  F = "undefined" !== typeof setImmediate ? setImmediate : null;
"undefined" !== typeof navigator && void 0 !== navigator.scheduling && void 0 !== navigator.scheduling.isInputPending && navigator.scheduling.isInputPending.bind(navigator.scheduling);
function G(a) {
  for (var b = h(t); null !== b;) {
    if (null === b.callback) k(t);else if (b.startTime <= a) k(t), b.sortIndex = b.expirationTime, f(r, b);else break;
    b = h(t);
  }
}
function H(a) {
  B = !1;
  G(a);
  if (!A) if (null !== h(r)) A = !0, I(J);else {
    var b = h(t);
    null !== b && K(H, b.startTime - a);
  }
}
function J(a, b) {
  A = !1;
  B && (B = !1, E(L), L = -1);
  z = !0;
  var c = y;
  try {
    G(b);
    for (v = h(r); null !== v && (!(v.expirationTime > b) || a && !M());) {
      var d = v.callback;
      if ("function" === typeof d) {
        v.callback = null;
        y = v.priorityLevel;
        var e = d(v.expirationTime <= b);
        b = exports.unstable_now();
        "function" === typeof e ? v.callback = e : v === h(r) && k(r);
        G(b);
      } else k(r);
      v = h(r);
    }
    if (null !== v) var w = !0;else {
      var m = h(t);
      null !== m && K(H, m.startTime - b);
      w = !1;
    }
    return w;
  } finally {
    v = null, y = c, z = !1;
  }
}
var N = !1,
  O = null,
  L = -1,
  P = 5,
  Q = -1;
function M() {
  return exports.unstable_now() - Q < P ? !1 : !0;
}
function R() {
  if (null !== O) {
    var a = exports.unstable_now();
    Q = a;
    var b = !0;
    try {
      b = O(!0, a);
    } finally {
      b ? S() : (N = !1, O = null);
    }
  } else N = !1;
}
var S;
if ("function" === typeof F) S = function () {
  F(R);
};else if ("undefined" !== typeof MessageChannel) {
  var T = new MessageChannel(),
    U = T.port2;
  T.port1.onmessage = R;
  S = function () {
    U.postMessage(null);
  };
} else S = function () {
  D(R, 0);
};
function I(a) {
  O = a;
  N || (N = !0, S());
}
function K(a, b) {
  L = D(function () {
    a(exports.unstable_now());
  }, b);
}
exports.unstable_IdlePriority = 5;
exports.unstable_ImmediatePriority = 1;
exports.unstable_LowPriority = 4;
exports.unstable_NormalPriority = 3;
exports.unstable_Profiling = null;
exports.unstable_UserBlockingPriority = 2;
exports.unstable_cancelCallback = function (a) {
  a.callback = null;
};
exports.unstable_continueExecution = function () {
  A || z || (A = !0, I(J));
};
exports.unstable_forceFrameRate = function (a) {
  0 > a || 125 < a ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : P = 0 < a ? Math.floor(1E3 / a) : 5;
};
exports.unstable_getCurrentPriorityLevel = function () {
  return y;
};
exports.unstable_getFirstCallbackNode = function () {
  return h(r);
};
exports.unstable_next = function (a) {
  switch (y) {
    case 1:
    case 2:
    case 3:
      var b = 3;
      break;
    default:
      b = y;
  }
  var c = y;
  y = b;
  try {
    return a();
  } finally {
    y = c;
  }
};
exports.unstable_pauseExecution = function () {};
exports.unstable_requestPaint = function () {};
exports.unstable_runWithPriority = function (a, b) {
  switch (a) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
      break;
    default:
      a = 3;
  }
  var c = y;
  y = a;
  try {
    return b();
  } finally {
    y = c;
  }
};
exports.unstable_scheduleCallback = function (a, b, c) {
  var d = exports.unstable_now();
  "object" === typeof c && null !== c ? (c = c.delay, c = "number" === typeof c && 0 < c ? d + c : d) : c = d;
  switch (a) {
    case 1:
      var e = -1;
      break;
    case 2:
      e = 250;
      break;
    case 5:
      e = 1073741823;
      break;
    case 4:
      e = 1E4;
      break;
    default:
      e = 5E3;
  }
  e = c + e;
  a = {
    id: u++,
    callback: b,
    priorityLevel: a,
    startTime: c,
    expirationTime: e,
    sortIndex: -1
  };
  c > d ? (a.sortIndex = c, f(t, a), null === h(r) && a === h(t) && (B ? (E(L), L = -1) : B = !0, K(H, c - d))) : (a.sortIndex = e, f(r, a), A || z || (A = !0, I(J)));
  return a;
};
exports.unstable_shouldYield = M;
exports.unstable_wrapCallback = function (a) {
  var b = y;
  return function () {
    var c = y;
    y = b;
    try {
      return a.apply(this, arguments);
    } finally {
      y = c;
    }
  };
};

/***/ }),

/***/ 853:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


if (true) {
  module.exports = __webpack_require__(234);
} else {}

/***/ }),

/***/ 324:
/***/ ((module) => {

//

module.exports = function shallowEqual(objA, objB, compare, compareContext) {
  var ret = compare ? compare.call(compareContext, objA, objB) : void 0;
  if (ret !== void 0) {
    return !!ret;
  }
  if (objA === objB) {
    return true;
  }
  if (typeof objA !== "object" || !objA || typeof objB !== "object" || !objB) {
    return false;
  }
  var keysA = Object.keys(objA);
  var keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) {
    return false;
  }
  var bHasOwnProperty = Object.prototype.hasOwnProperty.bind(objB);

  // Test for A's keys different from B.
  for (var idx = 0; idx < keysA.length; idx++) {
    var key = keysA[idx];
    if (!bHasOwnProperty(key)) {
      return false;
    }
    var valueA = objA[key];
    var valueB = objB[key];
    ret = compare ? compare.call(compareContext, valueA, valueB, key) : void 0;
    if (ret === false || ret === void 0 && valueA !== valueB) {
      return false;
    }
  }
  return true;
};

/***/ }),

/***/ 681:
/***/ ((module) => {

"use strict";

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "static/js/" + chunkId + "." + "a15da546" + ".chunk.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get mini-css chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.miniCssF = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return undefined;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/load script */
/******/ 	(() => {
/******/ 		var inProgress = {};
/******/ 		var dataWebpackPrefix = "redesign-online-discourse:";
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key, chunkId) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == dataWebpackPrefix + key) { script = s; break; }
/******/ 				}
/******/ 			}
/******/ 			if(!script) {
/******/ 				needAttach = true;
/******/ 				script = document.createElement('script');
/******/ 		
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.setAttribute("data-webpack", dataWebpackPrefix + key);
/******/ 		
/******/ 				script.src = url;
/******/ 			}
/******/ 			inProgress[url] = [done];
/******/ 			var onScriptComplete = (prev, event) => {
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				var doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode && script.parentNode.removeChild(script);
/******/ 				doneFns && doneFns.forEach((fn) => (fn(event)));
/******/ 				if(prev) return prev(event);
/******/ 			}
/******/ 			var timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 120000);
/******/ 			script.onerror = onScriptComplete.bind(null, script.onerror);
/******/ 			script.onload = onScriptComplete.bind(null, script.onload);
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/node module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.nmd = (module) => {
/******/ 			module.paths = [];
/******/ 			if (!module.children) module.children = [];
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "/";
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			792: 0
/******/ 		};
/******/ 		
/******/ 		__webpack_require__.f.j = (chunkId, promises) => {
/******/ 				// JSONP chunk loading for javascript
/******/ 				var installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 				if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 					// a Promise means "currently loading".
/******/ 					if(installedChunkData) {
/******/ 						promises.push(installedChunkData[2]);
/******/ 					} else {
/******/ 						if(true) { // all chunks have JS
/******/ 							// setup Promise in chunk cache
/******/ 							var promise = new Promise((resolve, reject) => (installedChunkData = installedChunks[chunkId] = [resolve, reject]));
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// start chunk loading
/******/ 							var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							var loadingEnded = (event) => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) {
/******/ 										var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 										var realSrc = event && event.target && event.target.src;
/******/ 										error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realSrc;
/******/ 										installedChunkData[1](error);
/******/ 									}
/******/ 								}
/******/ 							};
/******/ 							__webpack_require__.l(url, loadingEnded, "chunk-" + chunkId, chunkId);
/******/ 						}
/******/ 					}
/******/ 				}
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 			var runtime = data[2];
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 		
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunkredesign_online_discourse"] = self["webpackChunkredesign_online_discourse"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/nonce */
/******/ 	(() => {
/******/ 		__webpack_require__.nc = undefined;
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";

// EXTERNAL MODULE: ./node_modules/react/index.js
var react = __webpack_require__(43);
// EXTERNAL MODULE: ./node_modules/react-dom/client.js
var client = __webpack_require__(391);
;// CONCATENATED MODULE: ./src/index.css
// extracted by mini-css-extract-plugin
/* harmony default export */ const src = ({});
;// CONCATENATED MODULE: ./src/App.css
// extracted by mini-css-extract-plugin
/* harmony default export */ const App = ({});
;// CONCATENATED MODULE: ./src/utils/logger.js
function logger_logEvent(action,user_id,folder_name){const log={id:"".concat(Date.now()),// Generate a unique ID based on timestamp
user_id:user_id,action:action,folder_name:folder_name,timestamp:new Date().toISOString()};fetch("".concat("https://redesign-online-discourse.vercel.app","/log"),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(log)}).catch(error=>{console.error('Error sending to the server:',error);});}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/taggedTemplateLiteral.js
function _taggedTemplateLiteral(e, t) {
  return t || (t = e.slice(0)), Object.freeze(Object.defineProperties(e, {
    raw: {
      value: Object.freeze(t)
    }
  }));
}

;// CONCATENATED MODULE: ./node_modules/styled-components/node_modules/tslib/tslib.es6.mjs
/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */

var extendStatics = function (d, b) {
  extendStatics = Object.setPrototypeOf || {
    __proto__: []
  } instanceof Array && function (d, b) {
    d.__proto__ = b;
  } || function (d, b) {
    for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
  };
  return extendStatics(d, b);
};
function __extends(d, b) {
  if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
var __assign = function () {
  __assign = Object.assign || function __assign(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
  };
  return __assign.apply(this, arguments);
};
function __rest(s, e) {
  var t = {};
  for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function") for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
    if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
  }
  return t;
}
function __decorate(decorators, target, key, desc) {
  var c = arguments.length,
    r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
    d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function __param(paramIndex, decorator) {
  return function (target, key) {
    decorator(target, key, paramIndex);
  };
}
function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
  function accept(f) {
    if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
    return f;
  }
  var kind = contextIn.kind,
    key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
  var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
  var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
  var _,
    done = false;
  for (var i = decorators.length - 1; i >= 0; i--) {
    var context = {};
    for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
    for (var p in contextIn.access) context.access[p] = contextIn.access[p];
    context.addInitializer = function (f) {
      if (done) throw new TypeError("Cannot add initializers after decoration has completed");
      extraInitializers.push(accept(f || null));
    };
    var result = (0, decorators[i])(kind === "accessor" ? {
      get: descriptor.get,
      set: descriptor.set
    } : descriptor[key], context);
    if (kind === "accessor") {
      if (result === void 0) continue;
      if (result === null || typeof result !== "object") throw new TypeError("Object expected");
      if (_ = accept(result.get)) descriptor.get = _;
      if (_ = accept(result.set)) descriptor.set = _;
      if (_ = accept(result.init)) initializers.unshift(_);
    } else if (_ = accept(result)) {
      if (kind === "field") initializers.unshift(_);else descriptor[key] = _;
    }
  }
  if (target) Object.defineProperty(target, contextIn.name, descriptor);
  done = true;
}
;
function __runInitializers(thisArg, initializers, value) {
  var useValue = arguments.length > 2;
  for (var i = 0; i < initializers.length; i++) {
    value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
  }
  return useValue ? value : void 0;
}
;
function __propKey(x) {
  return typeof x === "symbol" ? x : "".concat(x);
}
;
function __setFunctionName(f, name, prefix) {
  if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
  return Object.defineProperty(f, "name", {
    configurable: true,
    value: prefix ? "".concat(prefix, " ", name) : name
  });
}
;
function __metadata(metadataKey, metadataValue) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}
function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
function __generator(thisArg, body) {
  var _ = {
      label: 0,
      sent: function () {
        if (t[0] & 1) throw t[1];
        return t[1];
      },
      trys: [],
      ops: []
    },
    f,
    y,
    t,
    g;
  return g = {
    next: verb(0),
    "throw": verb(1),
    "return": verb(2)
  }, typeof Symbol === "function" && (g[Symbol.iterator] = function () {
    return this;
  }), g;
  function verb(n) {
    return function (v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _) try {
      if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
      if (y = 0, t) op = [op[0] & 2, t.value];
      switch (op[0]) {
        case 0:
        case 1:
          t = op;
          break;
        case 4:
          _.label++;
          return {
            value: op[1],
            done: false
          };
        case 5:
          _.label++;
          y = op[1];
          op = [0];
          continue;
        case 7:
          op = _.ops.pop();
          _.trys.pop();
          continue;
        default:
          if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
            _ = 0;
            continue;
          }
          if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
            _.label = op[1];
            break;
          }
          if (op[0] === 6 && _.label < t[1]) {
            _.label = t[1];
            t = op;
            break;
          }
          if (t && _.label < t[2]) {
            _.label = t[2];
            _.ops.push(op);
            break;
          }
          if (t[2]) _.ops.pop();
          _.trys.pop();
          continue;
      }
      op = body.call(thisArg, _);
    } catch (e) {
      op = [6, e];
      y = 0;
    } finally {
      f = t = 0;
    }
    if (op[0] & 5) throw op[1];
    return {
      value: op[0] ? op[1] : void 0,
      done: true
    };
  }
}
var __createBinding = Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  var desc = Object.getOwnPropertyDescriptor(m, k);
  if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    desc = {
      enumerable: true,
      get: function () {
        return m[k];
      }
    };
  }
  Object.defineProperty(o, k2, desc);
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
};
function __exportStar(m, o) {
  for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
}
function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator,
    m = s && o[s],
    i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
    next: function () {
      if (o && i >= o.length) o = void 0;
      return {
        value: o && o[i++],
        done: !o
      };
    }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function __read(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o),
    r,
    ar = [],
    e;
  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  } catch (error) {
    e = {
      error: error
    };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
}

/** @deprecated */
function __spread() {
  for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
  return ar;
}

/** @deprecated */
function __spreadArrays() {
  for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
  for (var r = Array(s), k = 0, i = 0; i < il; i++) for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++) r[k] = a[j];
  return r;
}
function __spreadArray(to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
}
function __await(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
}
function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []),
    i,
    q = [];
  return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () {
    return this;
  }, i;
  function verb(n) {
    if (g[n]) i[n] = function (v) {
      return new Promise(function (a, b) {
        q.push([n, v, a, b]) > 1 || resume(n, v);
      });
    };
  }
  function resume(n, v) {
    try {
      step(g[n](v));
    } catch (e) {
      settle(q[0][3], e);
    }
  }
  function step(r) {
    r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
  }
  function fulfill(value) {
    resume("next", value);
  }
  function reject(value) {
    resume("throw", value);
  }
  function settle(f, v) {
    if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
  }
}
function __asyncDelegator(o) {
  var i, p;
  return i = {}, verb("next"), verb("throw", function (e) {
    throw e;
  }), verb("return"), i[Symbol.iterator] = function () {
    return this;
  }, i;
  function verb(n, f) {
    i[n] = o[n] ? function (v) {
      return (p = !p) ? {
        value: __await(o[n](v)),
        done: false
      } : f ? f(v) : v;
    } : f;
  }
}
function __asyncValues(o) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator],
    i;
  return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () {
    return this;
  }, i);
  function verb(n) {
    i[n] = o[n] && function (v) {
      return new Promise(function (resolve, reject) {
        v = o[n](v), settle(resolve, reject, v.done, v.value);
      });
    };
  }
  function settle(resolve, reject, d, v) {
    Promise.resolve(v).then(function (v) {
      resolve({
        value: v,
        done: d
      });
    }, reject);
  }
}
function __makeTemplateObject(cooked, raw) {
  if (Object.defineProperty) {
    Object.defineProperty(cooked, "raw", {
      value: raw
    });
  } else {
    cooked.raw = raw;
  }
  return cooked;
}
;
var __setModuleDefault = Object.create ? function (o, v) {
  Object.defineProperty(o, "default", {
    enumerable: true,
    value: v
  });
} : function (o, v) {
  o["default"] = v;
};
function __importStar(mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  __setModuleDefault(result, mod);
  return result;
}
function __importDefault(mod) {
  return mod && mod.__esModule ? mod : {
    default: mod
  };
}
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
function __classPrivateFieldIn(state, receiver) {
  if (receiver === null || typeof receiver !== "object" && typeof receiver !== "function") throw new TypeError("Cannot use 'in' operator on non-object");
  return typeof state === "function" ? receiver === state : state.has(receiver);
}
function __addDisposableResource(env, value, async) {
  if (value !== null && value !== void 0) {
    if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
    var dispose;
    if (async) {
      if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
      dispose = value[Symbol.asyncDispose];
    }
    if (dispose === void 0) {
      if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
      dispose = value[Symbol.dispose];
    }
    if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
    env.stack.push({
      value: value,
      dispose: dispose,
      async: async
    });
  } else if (async) {
    env.stack.push({
      async: true
    });
  }
  return value;
}
var _SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};
function __disposeResources(env) {
  function fail(e) {
    env.error = env.hasError ? new _SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
    env.hasError = true;
  }
  function next() {
    while (env.stack.length) {
      var rec = env.stack.pop();
      try {
        var result = rec.dispose && rec.dispose.call(rec.value);
        if (rec.async) return Promise.resolve(result).then(next, function (e) {
          fail(e);
          return next();
        });
      } catch (e) {
        fail(e);
      }
    }
    if (env.hasError) throw env.error;
  }
  return next();
}
/* harmony default export */ const tslib_es6 = ({
  __extends,
  __assign,
  __rest,
  __decorate,
  __param,
  __metadata,
  __awaiter,
  __generator,
  __createBinding,
  __exportStar,
  __values,
  __read,
  __spread,
  __spreadArrays,
  __spreadArray,
  __await,
  __asyncGenerator,
  __asyncDelegator,
  __asyncValues,
  __makeTemplateObject,
  __importStar,
  __importDefault,
  __classPrivateFieldGet,
  __classPrivateFieldSet,
  __classPrivateFieldIn,
  __addDisposableResource,
  __disposeResources
});
// EXTERNAL MODULE: ./node_modules/shallowequal/index.js
var shallowequal = __webpack_require__(324);
var shallowequal_default = /*#__PURE__*/__webpack_require__.n(shallowequal);
;// CONCATENATED MODULE: ./node_modules/stylis/src/Enum.js
var MS = '-ms-';
var MOZ = '-moz-';
var WEBKIT = '-webkit-';
var COMMENT = 'comm';
var Enum_RULESET = 'rule';
var DECLARATION = 'decl';
var PAGE = '@page';
var MEDIA = '@media';
var IMPORT = '@import';
var CHARSET = '@charset';
var VIEWPORT = '@viewport';
var SUPPORTS = '@supports';
var DOCUMENT = '@document';
var NAMESPACE = '@namespace';
var KEYFRAMES = '@keyframes';
var FONT_FACE = '@font-face';
var COUNTER_STYLE = '@counter-style';
var FONT_FEATURE_VALUES = '@font-feature-values';
var LAYER = '@layer';
var SCOPE = '@scope';
;// CONCATENATED MODULE: ./node_modules/stylis/src/Utility.js
/**
 * @param {number}
 * @return {number}
 */
var abs = Math.abs;

/**
 * @param {number}
 * @return {string}
 */
var Utility_from = String.fromCharCode;

/**
 * @param {object}
 * @return {object}
 */
var Utility_assign = Object.assign;

/**
 * @param {string} value
 * @param {number} length
 * @return {number}
 */
function hash(value, length) {
  return Utility_charat(value, 0) ^ 45 ? (((length << 2 ^ Utility_charat(value, 0)) << 2 ^ Utility_charat(value, 1)) << 2 ^ Utility_charat(value, 2)) << 2 ^ Utility_charat(value, 3) : 0;
}

/**
 * @param {string} value
 * @return {string}
 */
function trim(value) {
  return value.trim();
}

/**
 * @param {string} value
 * @param {RegExp} pattern
 * @return {string?}
 */
function match(value, pattern) {
  return (value = pattern.exec(value)) ? value[0] : value;
}

/**
 * @param {string} value
 * @param {(string|RegExp)} pattern
 * @param {string} replacement
 * @return {string}
 */
function replace(value, pattern, replacement) {
  return value.replace(pattern, replacement);
}

/**
 * @param {string} value
 * @param {string} search
 * @param {number} position
 * @return {number}
 */
function indexof(value, search, position) {
  return value.indexOf(search, position);
}

/**
 * @param {string} value
 * @param {number} index
 * @return {number}
 */
function Utility_charat(value, index) {
  return value.charCodeAt(index) | 0;
}

/**
 * @param {string} value
 * @param {number} begin
 * @param {number} end
 * @return {string}
 */
function Utility_substr(value, begin, end) {
  return value.slice(begin, end);
}

/**
 * @param {string} value
 * @return {number}
 */
function Utility_strlen(value) {
  return value.length;
}

/**
 * @param {any[]} value
 * @return {number}
 */
function Utility_sizeof(value) {
  return value.length;
}

/**
 * @param {any} value
 * @param {any[]} array
 * @return {any}
 */
function Utility_append(value, array) {
  return array.push(value), value;
}

/**
 * @param {string[]} array
 * @param {function} callback
 * @return {string}
 */
function Utility_combine(array, callback) {
  return array.map(callback).join('');
}

/**
 * @param {string[]} array
 * @param {RegExp} pattern
 * @return {string[]}
 */
function filter(array, pattern) {
  return array.filter(function (value) {
    return !match(value, pattern);
  });
}
;// CONCATENATED MODULE: ./node_modules/stylis/src/Tokenizer.js

var line = 1;
var column = 1;
var Tokenizer_length = 0;
var position = 0;
var character = 0;
var characters = '';

/**
 * @param {string} value
 * @param {object | null} root
 * @param {object | null} parent
 * @param {string} type
 * @param {string[] | string} props
 * @param {object[] | string} children
 * @param {object[]} siblings
 * @param {number} length
 */
function node(value, root, parent, type, props, children, length, siblings) {
  return {
    value: value,
    root: root,
    parent: parent,
    type: type,
    props: props,
    children: children,
    line: line,
    column: column,
    length: length,
    return: '',
    siblings: siblings
  };
}

/**
 * @param {object} root
 * @param {object} props
 * @return {object}
 */
function copy(root, props) {
  return Utility_assign(node('', null, null, '', null, null, 0, root.siblings), root, {
    length: -root.length
  }, props);
}

/**
 * @param {object} root
 */
function lift(root) {
  while (root.root) root = copy(root.root, {
    children: [root]
  });
  Utility_append(root, root.siblings);
}

/**
 * @return {number}
 */
function Tokenizer_char() {
  return character;
}

/**
 * @return {number}
 */
function prev() {
  character = position > 0 ? Utility_charat(characters, --position) : 0;
  if (column--, character === 10) column = 1, line--;
  return character;
}

/**
 * @return {number}
 */
function next() {
  character = position < Tokenizer_length ? Utility_charat(characters, position++) : 0;
  if (column++, character === 10) column = 1, line++;
  return character;
}

/**
 * @return {number}
 */
function peek() {
  return Utility_charat(characters, position);
}

/**
 * @return {number}
 */
function caret() {
  return position;
}

/**
 * @param {number} begin
 * @param {number} end
 * @return {string}
 */
function slice(begin, end) {
  return Utility_substr(characters, begin, end);
}

/**
 * @param {number} type
 * @return {number}
 */
function token(type) {
  switch (type) {
    // \0 \t \n \r \s whitespace token
    case 0:
    case 9:
    case 10:
    case 13:
    case 32:
      return 5;
    // ! + , / > @ ~ isolate token
    case 33:
    case 43:
    case 44:
    case 47:
    case 62:
    case 64:
    case 126:
    // ; { } breakpoint token
    case 59:
    case 123:
    case 125:
      return 4;
    // : accompanied token
    case 58:
      return 3;
    // " ' ( [ opening delimit token
    case 34:
    case 39:
    case 40:
    case 91:
      return 2;
    // ) ] closing delimit token
    case 41:
    case 93:
      return 1;
  }
  return 0;
}

/**
 * @param {string} value
 * @return {any[]}
 */
function alloc(value) {
  return line = column = 1, Tokenizer_length = Utility_strlen(characters = value), position = 0, [];
}

/**
 * @param {any} value
 * @return {any}
 */
function dealloc(value) {
  return characters = '', value;
}

/**
 * @param {number} type
 * @return {string}
 */
function delimit(type) {
  return trim(slice(position - 1, delimiter(type === 91 ? type + 2 : type === 40 ? type + 1 : type)));
}

/**
 * @param {string} value
 * @return {string[]}
 */
function Tokenizer_tokenize(value) {
  return dealloc(tokenizer(alloc(value)));
}

/**
 * @param {number} type
 * @return {string}
 */
function whitespace(type) {
  while (character = peek()) if (character < 33) next();else break;
  return token(type) > 2 || token(character) > 3 ? '' : ' ';
}

/**
 * @param {string[]} children
 * @return {string[]}
 */
function tokenizer(children) {
  while (next()) switch (token(character)) {
    case 0:
      append(identifier(position - 1), children);
      break;
    case 2:
      append(delimit(character), children);
      break;
    default:
      append(from(character), children);
  }
  return children;
}

/**
 * @param {number} index
 * @param {number} count
 * @return {string}
 */
function escaping(index, count) {
  while (--count && next())
  // not 0-9 A-F a-f
  if (character < 48 || character > 102 || character > 57 && character < 65 || character > 70 && character < 97) break;
  return slice(index, caret() + (count < 6 && peek() == 32 && next() == 32));
}

/**
 * @param {number} type
 * @return {number}
 */
function delimiter(type) {
  while (next()) switch (character) {
    // ] ) " '
    case type:
      return position;
    // " '
    case 34:
    case 39:
      if (type !== 34 && type !== 39) delimiter(character);
      break;
    // (
    case 40:
      if (type === 41) delimiter(type);
      break;
    // \
    case 92:
      next();
      break;
  }
  return position;
}

/**
 * @param {number} type
 * @param {number} index
 * @return {number}
 */
function commenter(type, index) {
  while (next())
  // //
  if (type + character === 47 + 10) break;
  // /*
  else if (type + character === 42 + 42 && peek() === 47) break;
  return '/*' + slice(index, position - 1) + '*' + Utility_from(type === 47 ? type : next());
}

/**
 * @param {number} index
 * @return {string}
 */
function identifier(index) {
  while (!token(peek())) next();
  return slice(index, position);
}
;// CONCATENATED MODULE: ./node_modules/stylis/src/Serializer.js



/**
 * @param {object[]} children
 * @param {function} callback
 * @return {string}
 */
function serialize(children, callback) {
  var output = '';
  for (var i = 0; i < children.length; i++) output += callback(children[i], i, children, callback) || '';
  return output;
}

/**
 * @param {object} element
 * @param {number} index
 * @param {object[]} children
 * @param {function} callback
 * @return {string}
 */
function stringify(element, index, children, callback) {
  switch (element.type) {
    case LAYER:
      if (element.children.length) break;
    case IMPORT:
    case DECLARATION:
      return element.return = element.return || element.value;
    case COMMENT:
      return '';
    case KEYFRAMES:
      return element.return = element.value + '{' + serialize(element.children, callback) + '}';
    case Enum_RULESET:
      if (!Utility_strlen(element.value = element.props.join(','))) return '';
  }
  return Utility_strlen(children = serialize(element.children, callback)) ? element.return = element.value + '{' + children + '}' : '';
}
;// CONCATENATED MODULE: ./node_modules/stylis/src/Prefixer.js



/**
 * @param {string} value
 * @param {number} length
 * @param {object[]} children
 * @return {string}
 */
function prefix(value, length, children) {
  switch (hash(value, length)) {
    // color-adjust
    case 5103:
      return WEBKIT + 'print-' + value + value;
    // animation, animation-(delay|direction|duration|fill-mode|iteration-count|name|play-state|timing-function)
    case 5737:
    case 4201:
    case 3177:
    case 3433:
    case 1641:
    case 4457:
    case 2921:
    // text-decoration, filter, clip-path, backface-visibility, column, box-decoration-break
    case 5572:
    case 6356:
    case 5844:
    case 3191:
    case 6645:
    case 3005:
    // mask, mask-image, mask-(mode|clip|size), mask-(repeat|origin), mask-position, mask-composite,
    case 6391:
    case 5879:
    case 5623:
    case 6135:
    case 4599:
    case 4855:
    // background-clip, columns, column-(count|fill|gap|rule|rule-color|rule-style|rule-width|span|width)
    case 4215:
    case 6389:
    case 5109:
    case 5365:
    case 5621:
    case 3829:
      return WEBKIT + value + value;
    // tab-size
    case 4789:
      return MOZ + value + value;
    // appearance, user-select, transform, hyphens, text-size-adjust
    case 5349:
    case 4246:
    case 4810:
    case 6968:
    case 2756:
      return WEBKIT + value + MOZ + value + MS + value + value;
    // writing-mode
    case 5936:
      switch (Utility_charat(value, length + 11)) {
        // vertical-l(r)
        case 114:
          return WEBKIT + value + MS + replace(value, /[svh]\w+-[tblr]{2}/, 'tb') + value;
        // vertical-r(l)
        case 108:
          return WEBKIT + value + MS + replace(value, /[svh]\w+-[tblr]{2}/, 'tb-rl') + value;
        // horizontal(-)tb
        case 45:
          return WEBKIT + value + MS + replace(value, /[svh]\w+-[tblr]{2}/, 'lr') + value;
        // default: fallthrough to below
      }
    // flex, flex-direction, scroll-snap-type, writing-mode
    case 6828:
    case 4268:
    case 2903:
      return WEBKIT + value + MS + value + value;
    // order
    case 6165:
      return WEBKIT + value + MS + 'flex-' + value + value;
    // align-items
    case 5187:
      return WEBKIT + value + replace(value, /(\w+).+(:[^]+)/, WEBKIT + 'box-$1$2' + MS + 'flex-$1$2') + value;
    // align-self
    case 5443:
      return WEBKIT + value + MS + 'flex-item-' + replace(value, /flex-|-self/g, '') + (!match(value, /flex-|baseline/) ? MS + 'grid-row-' + replace(value, /flex-|-self/g, '') : '') + value;
    // align-content
    case 4675:
      return WEBKIT + value + MS + 'flex-line-pack' + replace(value, /align-content|flex-|-self/g, '') + value;
    // flex-shrink
    case 5548:
      return WEBKIT + value + MS + replace(value, 'shrink', 'negative') + value;
    // flex-basis
    case 5292:
      return WEBKIT + value + MS + replace(value, 'basis', 'preferred-size') + value;
    // flex-grow
    case 6060:
      return WEBKIT + 'box-' + replace(value, '-grow', '') + WEBKIT + value + MS + replace(value, 'grow', 'positive') + value;
    // transition
    case 4554:
      return WEBKIT + replace(value, /([^-])(transform)/g, '$1' + WEBKIT + '$2') + value;
    // cursor
    case 6187:
      return replace(replace(replace(value, /(zoom-|grab)/, WEBKIT + '$1'), /(image-set)/, WEBKIT + '$1'), value, '') + value;
    // background, background-image
    case 5495:
    case 3959:
      return replace(value, /(image-set\([^]*)/, WEBKIT + '$1' + '$`$1');
    // justify-content
    case 4968:
      return replace(replace(value, /(.+:)(flex-)?(.*)/, WEBKIT + 'box-pack:$3' + MS + 'flex-pack:$3'), /s.+-b[^;]+/, 'justify') + WEBKIT + value + value;
    // justify-self
    case 4200:
      if (!match(value, /flex-|baseline/)) return MS + 'grid-column-align' + Utility_substr(value, length) + value;
      break;
    // grid-template-(columns|rows)
    case 2592:
    case 3360:
      return MS + replace(value, 'template-', '') + value;
    // grid-(row|column)-start
    case 4384:
    case 3616:
      if (children && children.some(function (element, index) {
        return length = index, match(element.props, /grid-\w+-end/);
      })) {
        return ~indexof(value + (children = children[length].value), 'span', 0) ? value : MS + replace(value, '-start', '') + value + MS + 'grid-row-span:' + (~indexof(children, 'span', 0) ? match(children, /\d+/) : +match(children, /\d+/) - +match(value, /\d+/)) + ';';
      }
      return MS + replace(value, '-start', '') + value;
    // grid-(row|column)-end
    case 4896:
    case 4128:
      return children && children.some(function (element) {
        return match(element.props, /grid-\w+-start/);
      }) ? value : MS + replace(replace(value, '-end', '-span'), 'span ', '') + value;
    // (margin|padding)-inline-(start|end)
    case 4095:
    case 3583:
    case 4068:
    case 2532:
      return replace(value, /(.+)-inline(.+)/, WEBKIT + '$1$2') + value;
    // (min|max)?(width|height|inline-size|block-size)
    case 8116:
    case 7059:
    case 5753:
    case 5535:
    case 5445:
    case 5701:
    case 4933:
    case 4677:
    case 5533:
    case 5789:
    case 5021:
    case 4765:
      // stretch, max-content, min-content, fill-available
      if (Utility_strlen(value) - 1 - length > 6) switch (Utility_charat(value, length + 1)) {
        // (m)ax-content, (m)in-content
        case 109:
          // -
          if (Utility_charat(value, length + 4) !== 45) break;
        // (f)ill-available, (f)it-content
        case 102:
          return replace(value, /(.+:)(.+)-([^]+)/, '$1' + WEBKIT + '$2-$3' + '$1' + MOZ + (Utility_charat(value, length + 3) == 108 ? '$3' : '$2-$3')) + value;
        // (s)tretch
        case 115:
          return ~indexof(value, 'stretch', 0) ? prefix(replace(value, 'stretch', 'fill-available'), length, children) + value : value;
      }
      break;
    // grid-(column|row)
    case 5152:
    case 5920:
      return replace(value, /(.+?):(\d+)(\s*\/\s*(span)?\s*(\d+))?(.*)/, function (_, a, b, c, d, e, f) {
        return MS + a + ':' + b + f + (c ? MS + a + '-span:' + (d ? e : +e - +b) + f : '') + value;
      });
    // position: sticky
    case 4949:
      // stick(y)?
      if (Utility_charat(value, length + 6) === 121) return replace(value, ':', ':' + WEBKIT) + value;
      break;
    // display: (flex|inline-flex|grid|inline-grid)
    case 6444:
      switch (Utility_charat(value, Utility_charat(value, 14) === 45 ? 18 : 11)) {
        // (inline-)?fle(x)
        case 120:
          return replace(value, /(.+:)([^;\s!]+)(;|(\s+)?!.+)?/, '$1' + WEBKIT + (Utility_charat(value, 14) === 45 ? 'inline-' : '') + 'box$3' + '$1' + WEBKIT + '$2$3' + '$1' + MS + '$2box$3') + value;
        // (inline-)?gri(d)
        case 100:
          return replace(value, ':', ':' + MS) + value;
      }
      break;
    // scroll-margin, scroll-margin-(top|right|bottom|left)
    case 5719:
    case 2647:
    case 2135:
    case 3927:
    case 2391:
      return replace(value, 'scroll-', 'scroll-snap-') + value;
  }
  return value;
}
;// CONCATENATED MODULE: ./node_modules/stylis/src/Middleware.js






/**
 * @param {function[]} collection
 * @return {function}
 */
function middleware(collection) {
  var length = Utility_sizeof(collection);
  return function (element, index, children, callback) {
    var output = '';
    for (var i = 0; i < length; i++) output += collection[i](element, index, children, callback) || '';
    return output;
  };
}

/**
 * @param {function} callback
 * @return {function}
 */
function rulesheet(callback) {
  return function (element) {
    if (!element.root) if (element = element.return) callback(element);
  };
}

/**
 * @param {object} element
 * @param {number} index
 * @param {object[]} children
 * @param {function} callback
 */
function prefixer(element, index, children, callback) {
  if (element.length > -1) if (!element.return) switch (element.type) {
    case DECLARATION:
      element.return = prefix(element.value, element.length, children);
      return;
    case KEYFRAMES:
      return serialize([copy(element, {
        value: replace(element.value, '@', '@' + WEBKIT)
      })], callback);
    case Enum_RULESET:
      if (element.length) return Utility_combine(children = element.props, function (value) {
        switch (match(value, callback = /(::plac\w+|:read-\w+)/)) {
          // :read-(only|write)
          case ':read-only':
          case ':read-write':
            lift(copy(element, {
              props: [replace(value, /:(read-\w+)/, ':' + MOZ + '$1')]
            }));
            lift(copy(element, {
              props: [value]
            }));
            Utility_assign(element, {
              props: filter(children, callback)
            });
            break;
          // :placeholder
          case '::placeholder':
            lift(copy(element, {
              props: [replace(value, /:(plac\w+)/, ':' + WEBKIT + 'input-$1')]
            }));
            lift(copy(element, {
              props: [replace(value, /:(plac\w+)/, ':' + MOZ + '$1')]
            }));
            lift(copy(element, {
              props: [replace(value, /:(plac\w+)/, MS + 'input-$1')]
            }));
            lift(copy(element, {
              props: [value]
            }));
            Utility_assign(element, {
              props: filter(children, callback)
            });
            break;
        }
        return '';
      });
  }
}

/**
 * @param {object} element
 * @param {number} index
 * @param {object[]} children
 */
function namespace(element) {
  switch (element.type) {
    case RULESET:
      element.props = element.props.map(function (value) {
        return combine(tokenize(value), function (value, index, children) {
          switch (charat(value, 0)) {
            // \f
            case 12:
              return substr(value, 1, strlen(value));
            // \0 ( + > ~
            case 0:
            case 40:
            case 43:
            case 62:
            case 126:
              return value;
            // :
            case 58:
              if (children[++index] === 'global') children[index] = '', children[++index] = '\f' + substr(children[index], index = 1, -1);
            // \s
            case 32:
              return index === 1 ? '' : value;
            default:
              switch (index) {
                case 0:
                  element = value;
                  return sizeof(children) > 1 ? '' : value;
                case index = sizeof(children) - 1:
                case 2:
                  return index === 2 ? value + element + element : value + element;
                default:
                  return value;
              }
          }
        });
      });
  }
}
;// CONCATENATED MODULE: ./node_modules/stylis/src/Parser.js




/**
 * @param {string} value
 * @return {object[]}
 */
function compile(value) {
  return dealloc(parse('', null, null, null, [''], value = alloc(value), 0, [0], value));
}

/**
 * @param {string} value
 * @param {object} root
 * @param {object?} parent
 * @param {string[]} rule
 * @param {string[]} rules
 * @param {string[]} rulesets
 * @param {number[]} pseudo
 * @param {number[]} points
 * @param {string[]} declarations
 * @return {object}
 */
function parse(value, root, parent, rule, rules, rulesets, pseudo, points, declarations) {
  var index = 0;
  var offset = 0;
  var length = pseudo;
  var atrule = 0;
  var property = 0;
  var previous = 0;
  var variable = 1;
  var scanning = 1;
  var ampersand = 1;
  var character = 0;
  var type = '';
  var props = rules;
  var children = rulesets;
  var reference = rule;
  var characters = type;
  while (scanning) switch (previous = character, character = next()) {
    // (
    case 40:
      if (previous != 108 && Utility_charat(characters, length - 1) == 58) {
        if (indexof(characters += replace(delimit(character), '&', '&\f'), '&\f', abs(index ? points[index - 1] : 0)) != -1) ampersand = -1;
        break;
      }
    // " ' [
    case 34:
    case 39:
    case 91:
      characters += delimit(character);
      break;
    // \t \n \r \s
    case 9:
    case 10:
    case 13:
    case 32:
      characters += whitespace(previous);
      break;
    // \
    case 92:
      characters += escaping(caret() - 1, 7);
      continue;
    // /
    case 47:
      switch (peek()) {
        case 42:
        case 47:
          Utility_append(comment(commenter(next(), caret()), root, parent, declarations), declarations);
          break;
        default:
          characters += '/';
      }
      break;
    // {
    case 123 * variable:
      points[index++] = Utility_strlen(characters) * ampersand;
    // } ; \0
    case 125 * variable:
    case 59:
    case 0:
      switch (character) {
        // \0 }
        case 0:
        case 125:
          scanning = 0;
        // ;
        case 59 + offset:
          if (ampersand == -1) characters = replace(characters, /\f/g, '');
          if (property > 0 && Utility_strlen(characters) - length) Utility_append(property > 32 ? declaration(characters + ';', rule, parent, length - 1, declarations) : declaration(replace(characters, ' ', '') + ';', rule, parent, length - 2, declarations), declarations);
          break;
        // @ ;
        case 59:
          characters += ';';
        // { rule/at-rule
        default:
          Utility_append(reference = ruleset(characters, root, parent, index, offset, rules, points, type, props = [], children = [], length, rulesets), rulesets);
          if (character === 123) if (offset === 0) parse(characters, root, reference, reference, props, rulesets, length, points, children);else switch (atrule === 99 && Utility_charat(characters, 3) === 110 ? 100 : atrule) {
            // d l m s
            case 100:
            case 108:
            case 109:
            case 115:
              parse(value, reference, reference, rule && Utility_append(ruleset(value, reference, reference, 0, 0, rules, points, type, rules, props = [], length, children), children), rules, children, length, points, rule ? props : children);
              break;
            default:
              parse(characters, reference, reference, reference, [''], children, 0, points, children);
          }
      }
      index = offset = property = 0, variable = ampersand = 1, type = characters = '', length = pseudo;
      break;
    // :
    case 58:
      length = 1 + Utility_strlen(characters), property = previous;
    default:
      if (variable < 1) if (character == 123) --variable;else if (character == 125 && variable++ == 0 && prev() == 125) continue;
      switch (characters += Utility_from(character), character * variable) {
        // &
        case 38:
          ampersand = offset > 0 ? 1 : (characters += '\f', -1);
          break;
        // ,
        case 44:
          points[index++] = (Utility_strlen(characters) - 1) * ampersand, ampersand = 1;
          break;
        // @
        case 64:
          // -
          if (peek() === 45) characters += delimit(next());
          atrule = peek(), offset = length = Utility_strlen(type = characters += identifier(caret())), character++;
          break;
        // -
        case 45:
          if (previous === 45 && Utility_strlen(characters) == 2) variable = 0;
      }
  }
  return rulesets;
}

/**
 * @param {string} value
 * @param {object} root
 * @param {object?} parent
 * @param {number} index
 * @param {number} offset
 * @param {string[]} rules
 * @param {number[]} points
 * @param {string} type
 * @param {string[]} props
 * @param {string[]} children
 * @param {number} length
 * @param {object[]} siblings
 * @return {object}
 */
function ruleset(value, root, parent, index, offset, rules, points, type, props, children, length, siblings) {
  var post = offset - 1;
  var rule = offset === 0 ? rules : [''];
  var size = Utility_sizeof(rule);
  for (var i = 0, j = 0, k = 0; i < index; ++i) for (var x = 0, y = Utility_substr(value, post + 1, post = abs(j = points[i])), z = value; x < size; ++x) if (z = trim(j > 0 ? rule[x] + ' ' + y : replace(y, /&\f/g, rule[x]))) props[k++] = z;
  return node(value, root, parent, offset === 0 ? Enum_RULESET : type, props, children, length, siblings);
}

/**
 * @param {number} value
 * @param {object} root
 * @param {object?} parent
 * @param {object[]} siblings
 * @return {object}
 */
function comment(value, root, parent, siblings) {
  return node(value, root, parent, COMMENT, Utility_from(Tokenizer_char()), Utility_substr(value, 2, -2), 0, siblings);
}

/**
 * @param {string} value
 * @param {object} root
 * @param {object?} parent
 * @param {number} length
 * @param {object[]} siblings
 * @return {object}
 */
function declaration(value, root, parent, length, siblings) {
  return node(value, root, parent, DECLARATION, Utility_substr(value, 0, length), Utility_substr(value, length + 1, -1), length, siblings);
}
;// CONCATENATED MODULE: ./node_modules/@emotion/unitless/dist/emotion-unitless.esm.js
var unitlessKeys = {
  animationIterationCount: 1,
  aspectRatio: 1,
  borderImageOutset: 1,
  borderImageSlice: 1,
  borderImageWidth: 1,
  boxFlex: 1,
  boxFlexGroup: 1,
  boxOrdinalGroup: 1,
  columnCount: 1,
  columns: 1,
  flex: 1,
  flexGrow: 1,
  flexPositive: 1,
  flexShrink: 1,
  flexNegative: 1,
  flexOrder: 1,
  gridRow: 1,
  gridRowEnd: 1,
  gridRowSpan: 1,
  gridRowStart: 1,
  gridColumn: 1,
  gridColumnEnd: 1,
  gridColumnSpan: 1,
  gridColumnStart: 1,
  msGridRow: 1,
  msGridRowSpan: 1,
  msGridColumn: 1,
  msGridColumnSpan: 1,
  fontWeight: 1,
  lineHeight: 1,
  opacity: 1,
  order: 1,
  orphans: 1,
  tabSize: 1,
  widows: 1,
  zIndex: 1,
  zoom: 1,
  WebkitLineClamp: 1,
  // SVG-related properties
  fillOpacity: 1,
  floodOpacity: 1,
  stopOpacity: 1,
  strokeDasharray: 1,
  strokeDashoffset: 1,
  strokeMiterlimit: 1,
  strokeOpacity: 1,
  strokeWidth: 1
};

;// CONCATENATED MODULE: ./node_modules/styled-components/dist/styled-components.browser.esm.js






var f = "undefined" != typeof process && void 0 !== ({"NODE_ENV":"production","PUBLIC_URL":"","WDS_SOCKET_HOST":undefined,"WDS_SOCKET_PATH":undefined,"WDS_SOCKET_PORT":undefined,"FAST_REFRESH":true,"REACT_APP_BACKEND_URL":"https://redesign-online-discourse.vercel.app"}) && (({"NODE_ENV":"production","PUBLIC_URL":"","WDS_SOCKET_HOST":undefined,"WDS_SOCKET_PATH":undefined,"WDS_SOCKET_PORT":undefined,"FAST_REFRESH":true,"REACT_APP_BACKEND_URL":"https://redesign-online-discourse.vercel.app"}).REACT_APP_SC_ATTR || ({"NODE_ENV":"production","PUBLIC_URL":"","WDS_SOCKET_HOST":undefined,"WDS_SOCKET_PATH":undefined,"WDS_SOCKET_PORT":undefined,"FAST_REFRESH":true,"REACT_APP_BACKEND_URL":"https://redesign-online-discourse.vercel.app"}).SC_ATTR) || "data-styled",
  m = "active",
  y = "data-styled-version",
  v = "6.1.11",
  g = "/*!sc*/\n",
  S = "undefined" != typeof window && "HTMLElement" in window,
  w = Boolean("boolean" == typeof SC_DISABLE_SPEEDY ? SC_DISABLE_SPEEDY : "undefined" != typeof process && void 0 !== ({"NODE_ENV":"production","PUBLIC_URL":"","WDS_SOCKET_HOST":undefined,"WDS_SOCKET_PATH":undefined,"WDS_SOCKET_PORT":undefined,"FAST_REFRESH":true,"REACT_APP_BACKEND_URL":"https://redesign-online-discourse.vercel.app"}) && void 0 !== ({"NODE_ENV":"production","PUBLIC_URL":"","WDS_SOCKET_HOST":undefined,"WDS_SOCKET_PATH":undefined,"WDS_SOCKET_PORT":undefined,"FAST_REFRESH":true,"REACT_APP_BACKEND_URL":"https://redesign-online-discourse.vercel.app"}).REACT_APP_SC_DISABLE_SPEEDY && "" !== ({"NODE_ENV":"production","PUBLIC_URL":"","WDS_SOCKET_HOST":undefined,"WDS_SOCKET_PATH":undefined,"WDS_SOCKET_PORT":undefined,"FAST_REFRESH":true,"REACT_APP_BACKEND_URL":"https://redesign-online-discourse.vercel.app"}).REACT_APP_SC_DISABLE_SPEEDY ? "false" !== ({"NODE_ENV":"production","PUBLIC_URL":"","WDS_SOCKET_HOST":undefined,"WDS_SOCKET_PATH":undefined,"WDS_SOCKET_PORT":undefined,"FAST_REFRESH":true,"REACT_APP_BACKEND_URL":"https://redesign-online-discourse.vercel.app"}).REACT_APP_SC_DISABLE_SPEEDY && ({"NODE_ENV":"production","PUBLIC_URL":"","WDS_SOCKET_HOST":undefined,"WDS_SOCKET_PATH":undefined,"WDS_SOCKET_PORT":undefined,"FAST_REFRESH":true,"REACT_APP_BACKEND_URL":"https://redesign-online-discourse.vercel.app"}).REACT_APP_SC_DISABLE_SPEEDY : "undefined" != typeof process && void 0 !== ({"NODE_ENV":"production","PUBLIC_URL":"","WDS_SOCKET_HOST":undefined,"WDS_SOCKET_PATH":undefined,"WDS_SOCKET_PORT":undefined,"FAST_REFRESH":true,"REACT_APP_BACKEND_URL":"https://redesign-online-discourse.vercel.app"}) && void 0 !== ({"NODE_ENV":"production","PUBLIC_URL":"","WDS_SOCKET_HOST":undefined,"WDS_SOCKET_PATH":undefined,"WDS_SOCKET_PORT":undefined,"FAST_REFRESH":true,"REACT_APP_BACKEND_URL":"https://redesign-online-discourse.vercel.app"}).SC_DISABLE_SPEEDY && "" !== ({"NODE_ENV":"production","PUBLIC_URL":"","WDS_SOCKET_HOST":undefined,"WDS_SOCKET_PATH":undefined,"WDS_SOCKET_PORT":undefined,"FAST_REFRESH":true,"REACT_APP_BACKEND_URL":"https://redesign-online-discourse.vercel.app"}).SC_DISABLE_SPEEDY ? "false" !== ({"NODE_ENV":"production","PUBLIC_URL":"","WDS_SOCKET_HOST":undefined,"WDS_SOCKET_PATH":undefined,"WDS_SOCKET_PORT":undefined,"FAST_REFRESH":true,"REACT_APP_BACKEND_URL":"https://redesign-online-discourse.vercel.app"}).SC_DISABLE_SPEEDY && ({"NODE_ENV":"production","PUBLIC_URL":"","WDS_SOCKET_HOST":undefined,"WDS_SOCKET_PATH":undefined,"WDS_SOCKET_PORT":undefined,"FAST_REFRESH":true,"REACT_APP_BACKEND_URL":"https://redesign-online-discourse.vercel.app"}).SC_DISABLE_SPEEDY : "production" !== "production"),
  b = {},
  E = /invalid hook call/i,
  N = new Set(),
  P = function (t, n) {
    if (false) { var a, o, s, i; }
  },
  _ = Object.freeze([]),
  C = Object.freeze({});
function I(e, t, n) {
  return void 0 === n && (n = C), e.theme !== n.theme && e.theme || t || n.theme;
}
var A = new Set(["a", "abbr", "address", "area", "article", "aside", "audio", "b", "base", "bdi", "bdo", "big", "blockquote", "body", "br", "button", "canvas", "caption", "cite", "code", "col", "colgroup", "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "hr", "html", "i", "iframe", "img", "input", "ins", "kbd", "keygen", "label", "legend", "li", "link", "main", "map", "mark", "menu", "menuitem", "meta", "meter", "nav", "noscript", "object", "ol", "optgroup", "option", "output", "p", "param", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "script", "section", "select", "small", "source", "span", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "time", "tr", "track", "u", "ul", "use", "var", "video", "wbr", "circle", "clipPath", "defs", "ellipse", "foreignObject", "g", "image", "line", "linearGradient", "marker", "mask", "path", "pattern", "polygon", "polyline", "radialGradient", "rect", "stop", "svg", "text", "tspan"]),
  O = /[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~-]+/g,
  D = /(^-|-$)/g;
function R(e) {
  return e.replace(O, "-").replace(D, "");
}
var T = /(a)(d)/gi,
  k = 52,
  j = function (e) {
    return String.fromCharCode(e + (e > 25 ? 39 : 97));
  };
function x(e) {
  var t,
    n = "";
  for (t = Math.abs(e); t > k; t = t / k | 0) n = j(t % k) + n;
  return (j(t % k) + n).replace(T, "$1-$2");
}
var V,
  F = 5381,
  M = function (e, t) {
    for (var n = t.length; n;) e = 33 * e ^ t.charCodeAt(--n);
    return e;
  },
  $ = function (e) {
    return M(F, e);
  };
function z(e) {
  return x($(e) >>> 0);
}
function B(e) {
  return  false || e.displayName || e.name || "Component";
}
function L(e) {
  return "string" == typeof e && ( true || 0);
}
var G = "function" == typeof Symbol && Symbol.for,
  Y = G ? Symbol.for("react.memo") : 60115,
  W = G ? Symbol.for("react.forward_ref") : 60112,
  q = {
    childContextTypes: !0,
    contextType: !0,
    contextTypes: !0,
    defaultProps: !0,
    displayName: !0,
    getDefaultProps: !0,
    getDerivedStateFromError: !0,
    getDerivedStateFromProps: !0,
    mixins: !0,
    propTypes: !0,
    type: !0
  },
  H = {
    name: !0,
    length: !0,
    prototype: !0,
    caller: !0,
    callee: !0,
    arguments: !0,
    arity: !0
  },
  U = {
    $$typeof: !0,
    compare: !0,
    defaultProps: !0,
    displayName: !0,
    propTypes: !0,
    type: !0
  },
  J = ((V = {})[W] = {
    $$typeof: !0,
    render: !0,
    defaultProps: !0,
    displayName: !0,
    propTypes: !0
  }, V[Y] = U, V);
function X(e) {
  return ("type" in (t = e) && t.type.$$typeof) === Y ? U : "$$typeof" in e ? J[e.$$typeof] : q;
  var t;
}
var Z = Object.defineProperty,
  K = Object.getOwnPropertyNames,
  Q = Object.getOwnPropertySymbols,
  ee = Object.getOwnPropertyDescriptor,
  te = Object.getPrototypeOf,
  ne = Object.prototype;
function oe(e, t, n) {
  if ("string" != typeof t) {
    if (ne) {
      var o = te(t);
      o && o !== ne && oe(e, o, n);
    }
    var r = K(t);
    Q && (r = r.concat(Q(t)));
    for (var s = X(e), i = X(t), a = 0; a < r.length; ++a) {
      var c = r[a];
      if (!(c in H || n && n[c] || i && c in i || s && c in s)) {
        var l = ee(t, c);
        try {
          Z(e, c, l);
        } catch (e) {}
      }
    }
  }
  return e;
}
function re(e) {
  return "function" == typeof e;
}
function se(e) {
  return "object" == typeof e && "styledComponentId" in e;
}
function ie(e, t) {
  return e && t ? "".concat(e, " ").concat(t) : e || t || "";
}
function ae(e, t) {
  if (0 === e.length) return "";
  for (var n = e[0], o = 1; o < e.length; o++) n += t ? t + e[o] : e[o];
  return n;
}
function ce(e) {
  return null !== e && "object" == typeof e && e.constructor.name === Object.name && !("props" in e && e.$$typeof);
}
function le(e, t, n) {
  if (void 0 === n && (n = !1), !n && !ce(e) && !Array.isArray(e)) return t;
  if (Array.isArray(t)) for (var o = 0; o < t.length; o++) e[o] = le(e[o], t[o]);else if (ce(t)) for (var o in t) e[o] = le(e[o], t[o]);
  return e;
}
function ue(e, t) {
  Object.defineProperty(e, "toString", {
    value: t
  });
}
var pe =  false ? 0 : {};
function de() {
  for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
  for (var n = e[0], o = [], r = 1, s = e.length; r < s; r += 1) o.push(e[r]);
  return o.forEach(function (e) {
    n = n.replace(/%[a-z]/, e);
  }), n;
}
function he(t) {
  for (var n = [], o = 1; o < arguments.length; o++) n[o - 1] = arguments[o];
  return  true ? new Error("An error occurred. See https://github.com/styled-components/styled-components/blob/main/packages/styled-components/src/utils/errors.md#".concat(t, " for more information.").concat(n.length > 0 ? " Args: ".concat(n.join(", ")) : "")) : 0;
}
var fe = function () {
    function e(e) {
      this.groupSizes = new Uint32Array(512), this.length = 512, this.tag = e;
    }
    return e.prototype.indexOfGroup = function (e) {
      for (var t = 0, n = 0; n < e; n++) t += this.groupSizes[n];
      return t;
    }, e.prototype.insertRules = function (e, t) {
      if (e >= this.groupSizes.length) {
        for (var n = this.groupSizes, o = n.length, r = o; e >= r;) if ((r <<= 1) < 0) throw he(16, "".concat(e));
        this.groupSizes = new Uint32Array(r), this.groupSizes.set(n), this.length = r;
        for (var s = o; s < r; s++) this.groupSizes[s] = 0;
      }
      for (var i = this.indexOfGroup(e + 1), a = (s = 0, t.length); s < a; s++) this.tag.insertRule(i, t[s]) && (this.groupSizes[e]++, i++);
    }, e.prototype.clearGroup = function (e) {
      if (e < this.length) {
        var t = this.groupSizes[e],
          n = this.indexOfGroup(e),
          o = n + t;
        this.groupSizes[e] = 0;
        for (var r = n; r < o; r++) this.tag.deleteRule(n);
      }
    }, e.prototype.getGroup = function (e) {
      var t = "";
      if (e >= this.length || 0 === this.groupSizes[e]) return t;
      for (var n = this.groupSizes[e], o = this.indexOfGroup(e), r = o + n, s = o; s < r; s++) t += "".concat(this.tag.getRule(s)).concat(g);
      return t;
    }, e;
  }(),
  me = (/* unused pure expression or super */ null && (1 << 30)),
  ye = new Map(),
  ve = new Map(),
  ge = 1,
  Se = function (e) {
    if (ye.has(e)) return ye.get(e);
    for (; ve.has(ge);) ge++;
    var t = ge++;
    if (false) {}
    return ye.set(e, t), ve.set(t, e), t;
  },
  we = function (e, t) {
    ge = t + 1, ye.set(e, t), ve.set(t, e);
  },
  be = "style[".concat(f, "][").concat(y, '="').concat(v, '"]'),
  Ee = new RegExp("^".concat(f, '\\.g(\\d+)\\[id="([\\w\\d-]+)"\\].*?"([^"]*)')),
  Ne = function (e, t, n) {
    for (var o, r = n.split(","), s = 0, i = r.length; s < i; s++) (o = r[s]) && e.registerName(t, o);
  },
  Pe = function (e, t) {
    for (var n, o = (null !== (n = t.textContent) && void 0 !== n ? n : "").split(g), r = [], s = 0, i = o.length; s < i; s++) {
      var a = o[s].trim();
      if (a) {
        var c = a.match(Ee);
        if (c) {
          var l = 0 | parseInt(c[1], 10),
            u = c[2];
          0 !== l && (we(u, l), Ne(e, u, c[3]), e.getTag().insertRules(l, r)), r.length = 0;
        } else r.push(a);
      }
    }
  };
function _e() {
  return  true ? __webpack_require__.nc : 0;
}
var Ce = function (e) {
    var t = document.head,
      n = e || t,
      o = document.createElement("style"),
      r = function (e) {
        var t = Array.from(e.querySelectorAll("style[".concat(f, "]")));
        return t[t.length - 1];
      }(n),
      s = void 0 !== r ? r.nextSibling : null;
    o.setAttribute(f, m), o.setAttribute(y, v);
    var i = _e();
    return i && o.setAttribute("nonce", i), n.insertBefore(o, s), o;
  },
  Ie = function () {
    function e(e) {
      this.element = Ce(e), this.element.appendChild(document.createTextNode("")), this.sheet = function (e) {
        if (e.sheet) return e.sheet;
        for (var t = document.styleSheets, n = 0, o = t.length; n < o; n++) {
          var r = t[n];
          if (r.ownerNode === e) return r;
        }
        throw he(17);
      }(this.element), this.length = 0;
    }
    return e.prototype.insertRule = function (e, t) {
      try {
        return this.sheet.insertRule(t, e), this.length++, !0;
      } catch (e) {
        return !1;
      }
    }, e.prototype.deleteRule = function (e) {
      this.sheet.deleteRule(e), this.length--;
    }, e.prototype.getRule = function (e) {
      var t = this.sheet.cssRules[e];
      return t && t.cssText ? t.cssText : "";
    }, e;
  }(),
  Ae = function () {
    function e(e) {
      this.element = Ce(e), this.nodes = this.element.childNodes, this.length = 0;
    }
    return e.prototype.insertRule = function (e, t) {
      if (e <= this.length && e >= 0) {
        var n = document.createTextNode(t);
        return this.element.insertBefore(n, this.nodes[e] || null), this.length++, !0;
      }
      return !1;
    }, e.prototype.deleteRule = function (e) {
      this.element.removeChild(this.nodes[e]), this.length--;
    }, e.prototype.getRule = function (e) {
      return e < this.length ? this.nodes[e].textContent : "";
    }, e;
  }(),
  Oe = function () {
    function e(e) {
      this.rules = [], this.length = 0;
    }
    return e.prototype.insertRule = function (e, t) {
      return e <= this.length && (this.rules.splice(e, 0, t), this.length++, !0);
    }, e.prototype.deleteRule = function (e) {
      this.rules.splice(e, 1), this.length--;
    }, e.prototype.getRule = function (e) {
      return e < this.length ? this.rules[e] : "";
    }, e;
  }(),
  De = S,
  Re = {
    isServer: !S,
    useCSSOMInjection: !w
  },
  Te = function () {
    function e(e, n, o) {
      void 0 === e && (e = C), void 0 === n && (n = {});
      var r = this;
      this.options = __assign(__assign({}, Re), e), this.gs = n, this.names = new Map(o), this.server = !!e.isServer, !this.server && S && De && (De = !1, function (e) {
        for (var t = document.querySelectorAll(be), n = 0, o = t.length; n < o; n++) {
          var r = t[n];
          r && r.getAttribute(f) !== m && (Pe(e, r), r.parentNode && r.parentNode.removeChild(r));
        }
      }(this)), ue(this, function () {
        return function (e) {
          for (var t = e.getTag(), n = t.length, o = "", r = function (n) {
              var r = function (e) {
                return ve.get(e);
              }(n);
              if (void 0 === r) return "continue";
              var s = e.names.get(r),
                i = t.getGroup(n);
              if (void 0 === s || 0 === i.length) return "continue";
              var a = "".concat(f, ".g").concat(n, '[id="').concat(r, '"]'),
                c = "";
              void 0 !== s && s.forEach(function (e) {
                e.length > 0 && (c += "".concat(e, ","));
              }), o += "".concat(i).concat(a, '{content:"').concat(c, '"}').concat(g);
            }, s = 0; s < n; s++) r(s);
          return o;
        }(r);
      });
    }
    return e.registerId = function (e) {
      return Se(e);
    }, e.prototype.reconstructWithOptions = function (n, o) {
      return void 0 === o && (o = !0), new e(__assign(__assign({}, this.options), n), this.gs, o && this.names || void 0);
    }, e.prototype.allocateGSInstance = function (e) {
      return this.gs[e] = (this.gs[e] || 0) + 1;
    }, e.prototype.getTag = function () {
      return this.tag || (this.tag = (e = function (e) {
        var t = e.useCSSOMInjection,
          n = e.target;
        return e.isServer ? new Oe(n) : t ? new Ie(n) : new Ae(n);
      }(this.options), new fe(e)));
      var e;
    }, e.prototype.hasNameForId = function (e, t) {
      return this.names.has(e) && this.names.get(e).has(t);
    }, e.prototype.registerName = function (e, t) {
      if (Se(e), this.names.has(e)) this.names.get(e).add(t);else {
        var n = new Set();
        n.add(t), this.names.set(e, n);
      }
    }, e.prototype.insertRules = function (e, t, n) {
      this.registerName(e, t), this.getTag().insertRules(Se(e), n);
    }, e.prototype.clearNames = function (e) {
      this.names.has(e) && this.names.get(e).clear();
    }, e.prototype.clearRules = function (e) {
      this.getTag().clearGroup(Se(e)), this.clearNames(e);
    }, e.prototype.clearTag = function () {
      this.tag = void 0;
    }, e;
  }(),
  ke = /&/g,
  je = /^\s*\/\/.*$/gm;
function xe(e, t) {
  return e.map(function (e) {
    return "rule" === e.type && (e.value = "".concat(t, " ").concat(e.value), e.value = e.value.replaceAll(",", ",".concat(t, " ")), e.props = e.props.map(function (e) {
      return "".concat(t, " ").concat(e);
    })), Array.isArray(e.children) && "@keyframes" !== e.type && (e.children = xe(e.children, t)), e;
  });
}
function Ve(e) {
  var t,
    n,
    o,
    r = void 0 === e ? C : e,
    s = r.options,
    i = void 0 === s ? C : s,
    a = r.plugins,
    c = void 0 === a ? _ : a,
    l = function (e, o, r) {
      return r.startsWith(n) && r.endsWith(n) && r.replaceAll(n, "").length > 0 ? ".".concat(t) : e;
    },
    u = c.slice();
  u.push(function (e) {
    e.type === Enum_RULESET && e.value.includes("&") && (e.props[0] = e.props[0].replace(ke, n).replace(o, l));
  }), i.prefix && u.push(prefixer), u.push(stringify);
  var p = function (e, r, s, a) {
    void 0 === r && (r = ""), void 0 === s && (s = ""), void 0 === a && (a = "&"), t = a, n = r, o = new RegExp("\\".concat(n, "\\b"), "g");
    var c = e.replace(je, ""),
      l = compile(s || r ? "".concat(s, " ").concat(r, " { ").concat(c, " }") : c);
    i.namespace && (l = xe(l, i.namespace));
    var p = [];
    return serialize(l, middleware(u.concat(rulesheet(function (e) {
      return p.push(e);
    })))), p;
  };
  return p.hash = c.length ? c.reduce(function (e, t) {
    return t.name || he(15), M(e, t.name);
  }, F).toString() : "", p;
}
var Fe = new Te(),
  Me = Ve(),
  $e = react.createContext({
    shouldForwardProp: void 0,
    styleSheet: Fe,
    stylis: Me
  }),
  ze = $e.Consumer,
  Be = react.createContext(void 0);
function Le() {
  return (0,react.useContext)($e);
}
function Ge(e) {
  var t = (0,react.useState)(e.stylisPlugins),
    n = t[0],
    r = t[1],
    c = Le().styleSheet,
    l = (0,react.useMemo)(function () {
      var t = c;
      return e.sheet ? t = e.sheet : e.target && (t = t.reconstructWithOptions({
        target: e.target
      }, !1)), e.disableCSSOMInjection && (t = t.reconstructWithOptions({
        useCSSOMInjection: !1
      })), t;
    }, [e.disableCSSOMInjection, e.sheet, e.target, c]),
    u = (0,react.useMemo)(function () {
      return Ve({
        options: {
          namespace: e.namespace,
          prefix: e.enableVendorPrefixes
        },
        plugins: n
      });
    }, [e.enableVendorPrefixes, e.namespace, n]);
  (0,react.useEffect)(function () {
    shallowequal_default()(n, e.stylisPlugins) || r(e.stylisPlugins);
  }, [e.stylisPlugins]);
  var d = (0,react.useMemo)(function () {
    return {
      shouldForwardProp: e.shouldForwardProp,
      styleSheet: l,
      stylis: u
    };
  }, [e.shouldForwardProp, l, u]);
  return react.createElement($e.Provider, {
    value: d
  }, react.createElement(Be.Provider, {
    value: u
  }, e.children));
}
var Ye = function () {
    function e(e, t) {
      var n = this;
      this.inject = function (e, t) {
        void 0 === t && (t = Me);
        var o = n.name + t.hash;
        e.hasNameForId(n.id, o) || e.insertRules(n.id, o, t(n.rules, o, "@keyframes"));
      }, this.name = e, this.id = "sc-keyframes-".concat(e), this.rules = t, ue(this, function () {
        throw he(12, String(n.name));
      });
    }
    return e.prototype.getName = function (e) {
      return void 0 === e && (e = Me), this.name + e.hash;
    }, e;
  }(),
  We = function (e) {
    return e >= "A" && e <= "Z";
  };
function qe(e) {
  for (var t = "", n = 0; n < e.length; n++) {
    var o = e[n];
    if (1 === n && "-" === o && "-" === e[0]) return e;
    We(o) ? t += "-" + o.toLowerCase() : t += o;
  }
  return t.startsWith("ms-") ? "-" + t : t;
}
var He = function (e) {
    return null == e || !1 === e || "" === e;
  },
  Ue = function (t) {
    var n,
      o,
      r = [];
    for (var s in t) {
      var i = t[s];
      t.hasOwnProperty(s) && !He(i) && (Array.isArray(i) && i.isCss || re(i) ? r.push("".concat(qe(s), ":"), i, ";") : ce(i) ? r.push.apply(r, __spreadArray(__spreadArray(["".concat(s, " {")], Ue(i), !1), ["}"], !1)) : r.push("".concat(qe(s), ": ").concat((n = s, null == (o = i) || "boolean" == typeof o || "" === o ? "" : "number" != typeof o || 0 === o || n in unitlessKeys || n.startsWith("--") ? String(o).trim() : "".concat(o, "px")), ";")));
    }
    return r;
  };
function Je(e, t, n, o) {
  if (He(e)) return [];
  if (se(e)) return [".".concat(e.styledComponentId)];
  if (re(e)) {
    if (!re(s = e) || s.prototype && s.prototype.isReactComponent || !t) return [e];
    var r = e(t);
    return  true || 0, Je(r, t, n, o);
  }
  var s;
  return e instanceof Ye ? n ? (e.inject(n, o), [e.getName(o)]) : [e] : ce(e) ? Ue(e) : Array.isArray(e) ? Array.prototype.concat.apply(_, e.map(function (e) {
    return Je(e, t, n, o);
  })) : [e.toString()];
}
function Xe(e) {
  for (var t = 0; t < e.length; t += 1) {
    var n = e[t];
    if (re(n) && !se(n)) return !1;
  }
  return !0;
}
var Ze = $(v),
  Ke = function () {
    function e(e, t, n) {
      this.rules = e, this.staticRulesId = "", this.isStatic =  true && (void 0 === n || n.isStatic) && Xe(e), this.componentId = t, this.baseHash = M(Ze, t), this.baseStyle = n, Te.registerId(t);
    }
    return e.prototype.generateAndInjectStyles = function (e, t, n) {
      var o = this.baseStyle ? this.baseStyle.generateAndInjectStyles(e, t, n) : "";
      if (this.isStatic && !n.hash) {
        if (this.staticRulesId && t.hasNameForId(this.componentId, this.staticRulesId)) o = ie(o, this.staticRulesId);else {
          var r = ae(Je(this.rules, e, t, n)),
            s = x(M(this.baseHash, r) >>> 0);
          if (!t.hasNameForId(this.componentId, s)) {
            var i = n(r, ".".concat(s), void 0, this.componentId);
            t.insertRules(this.componentId, s, i);
          }
          o = ie(o, s), this.staticRulesId = s;
        }
      } else {
        for (var a = M(this.baseHash, n.hash), c = "", l = 0; l < this.rules.length; l++) {
          var u = this.rules[l];
          if ("string" == typeof u) c += u,  false && (0);else if (u) {
            var p = ae(Je(u, e, t, n));
            a = M(a, p + l), c += p;
          }
        }
        if (c) {
          var d = x(a >>> 0);
          t.hasNameForId(this.componentId, d) || t.insertRules(this.componentId, d, n(c, ".".concat(d), void 0, this.componentId)), o = ie(o, d);
        }
      }
      return o;
    }, e;
  }(),
  Qe = react.createContext(void 0),
  et = Qe.Consumer;
function tt() {
  var e = c(Qe);
  if (!e) throw he(18);
  return e;
}
function nt(e) {
  var n = o.useContext(Qe),
    r = i(function () {
      return function (e, n) {
        if (!e) throw he(14);
        if (re(e)) {
          var o = e(n);
          if (false) {}
          return o;
        }
        if (Array.isArray(e) || "object" != typeof e) throw he(8);
        return n ? t(t({}, n), e) : e;
      }(e.theme, n);
    }, [e.theme, n]);
  return e.children ? o.createElement(Qe.Provider, {
    value: r
  }, e.children) : null;
}
var ot = {},
  rt = new Set();
function st(e, r, s) {
  var i = se(e),
    a = e,
    c = !L(e),
    p = r.attrs,
    d = void 0 === p ? _ : p,
    h = r.componentId,
    f = void 0 === h ? function (e, t) {
      var n = "string" != typeof e ? "sc" : R(e);
      ot[n] = (ot[n] || 0) + 1;
      var o = "".concat(n, "-").concat(z(v + n + ot[n]));
      return t ? "".concat(t, "-").concat(o) : o;
    }(r.displayName, r.parentComponentId) : h,
    m = r.displayName,
    y = void 0 === m ? function (e) {
      return L(e) ? "styled.".concat(e) : "Styled(".concat(B(e), ")");
    }(e) : m,
    g = r.displayName && r.componentId ? "".concat(R(r.displayName), "-").concat(r.componentId) : r.componentId || f,
    S = i && a.attrs ? a.attrs.concat(d).filter(Boolean) : d,
    w = r.shouldForwardProp;
  if (i && a.shouldForwardProp) {
    var b = a.shouldForwardProp;
    if (r.shouldForwardProp) {
      var E = r.shouldForwardProp;
      w = function (e, t) {
        return b(e, t) && E(e, t);
      };
    } else w = b;
  }
  var N = new Ke(s, g, i ? a.componentStyle : void 0);
  function O(e, r) {
    return function (e, r, s) {
      var i = e.attrs,
        a = e.componentStyle,
        c = e.defaultProps,
        p = e.foldedComponentIds,
        d = e.styledComponentId,
        h = e.target,
        f = react.useContext(Qe),
        m = Le(),
        y = e.shouldForwardProp || m.shouldForwardProp;
       false && 0;
      var v = I(r, f, c) || C,
        g = function (e, n, o) {
          for (var r, s = __assign(__assign({}, n), {
              className: void 0,
              theme: o
            }), i = 0; i < e.length; i += 1) {
            var a = re(r = e[i]) ? r(s) : r;
            for (var c in a) s[c] = "className" === c ? ie(s[c], a[c]) : "style" === c ? __assign(__assign({}, s[c]), a[c]) : a[c];
          }
          return n.className && (s.className = ie(s.className, n.className)), s;
        }(i, r, v),
        S = g.as || h,
        w = {};
      for (var b in g) void 0 === g[b] || "$" === b[0] || "as" === b || "theme" === b && g.theme === v || ("forwardedAs" === b ? w.as = g.forwardedAs : y && !y(b, S) || (w[b] = g[b], y || "development" !== "production" || 0 || 0 || 0 || (0)));
      var E = function (e, t) {
        var n = Le(),
          o = e.generateAndInjectStyles(t, n.styleSheet, n.stylis);
        return  false && 0, o;
      }(a, g);
       false && 0;
      var N = ie(p, d);
      return E && (N += " " + E), g.className && (N += " " + g.className), w[L(S) && !A.has(S) ? "class" : "className"] = N, w.ref = s, (0,react.createElement)(S, w);
    }(D, e, r);
  }
  O.displayName = y;
  var D = react.forwardRef(O);
  return D.attrs = S, D.componentStyle = N, D.displayName = y, D.shouldForwardProp = w, D.foldedComponentIds = i ? ie(a.foldedComponentIds, a.styledComponentId) : "", D.styledComponentId = g, D.target = i ? a.target : e, Object.defineProperty(D, "defaultProps", {
    get: function () {
      return this._foldedDefaultProps;
    },
    set: function (e) {
      this._foldedDefaultProps = i ? function (e) {
        for (var t = [], n = 1; n < arguments.length; n++) t[n - 1] = arguments[n];
        for (var o = 0, r = t; o < r.length; o++) le(e, r[o], !0);
        return e;
      }({}, a.defaultProps, e) : e;
    }
  }),  false && (0), ue(D, function () {
    return ".".concat(D.styledComponentId);
  }), c && oe(D, e, {
    attrs: !0,
    componentStyle: !0,
    displayName: !0,
    foldedComponentIds: !0,
    shouldForwardProp: !0,
    styledComponentId: !0,
    target: !0
  }), D;
}
function it(e, t) {
  for (var n = [e[0]], o = 0, r = t.length; o < r; o += 1) n.push(t[o], e[o + 1]);
  return n;
}
var at = function (e) {
  return Object.assign(e, {
    isCss: !0
  });
};
function ct(t) {
  for (var n = [], o = 1; o < arguments.length; o++) n[o - 1] = arguments[o];
  if (re(t) || ce(t)) return at(Je(it(_, __spreadArray([t], n, !0))));
  var r = t;
  return 0 === n.length && 1 === r.length && "string" == typeof r[0] ? Je(r) : at(Je(it(r, n)));
}
function lt(n, o, r) {
  if (void 0 === r && (r = C), !o) throw he(1, o);
  var s = function (t) {
    for (var s = [], i = 1; i < arguments.length; i++) s[i - 1] = arguments[i];
    return n(o, r, ct.apply(void 0, __spreadArray([t], s, !1)));
  };
  return s.attrs = function (e) {
    return lt(n, o, __assign(__assign({}, r), {
      attrs: Array.prototype.concat(r.attrs, e).filter(Boolean)
    }));
  }, s.withConfig = function (e) {
    return lt(n, o, __assign(__assign({}, r), e));
  }, s;
}
var ut = function (e) {
    return lt(st, e);
  },
  pt = ut;
A.forEach(function (e) {
  pt[e] = ut(e);
});
var dt = function () {
  function e(e, t) {
    this.rules = e, this.componentId = t, this.isStatic = Xe(e), Te.registerId(this.componentId + 1);
  }
  return e.prototype.createStyles = function (e, t, n, o) {
    var r = o(ae(Je(this.rules, t, n, o)), ""),
      s = this.componentId + e;
    n.insertRules(s, s, r);
  }, e.prototype.removeStyles = function (e, t) {
    t.clearRules(this.componentId + e);
  }, e.prototype.renderStyles = function (e, t, n, o) {
    e > 2 && Te.registerId(this.componentId + e), this.removeStyles(e, n), this.createStyles(e, t, n, o);
  }, e;
}();
function ht(n) {
  for (var r = [], s = 1; s < arguments.length; s++) r[s - 1] = arguments[s];
  var i = ct.apply(void 0, e([n], r, !1)),
    a = "sc-global-".concat(z(JSON.stringify(i))),
    c = new dt(i, a);
   false && 0;
  var l = function (e) {
    var t = Le(),
      n = o.useContext(Qe),
      r = o.useRef(t.styleSheet.allocateGSInstance(a)).current;
    return  false && 0,  false && 0, t.styleSheet.server && u(r, e, t.styleSheet, n, t.stylis), o.useLayoutEffect(function () {
      if (!t.styleSheet.server) return u(r, e, t.styleSheet, n, t.stylis), function () {
        return c.removeStyles(r, t.styleSheet);
      };
    }, [r, e, t.styleSheet, n, t.stylis]), null;
  };
  function u(e, n, o, r, s) {
    if (c.isStatic) c.renderStyles(e, b, o, s);else {
      var i = t(t({}, n), {
        theme: I(n, r, l.defaultProps)
      });
      c.renderStyles(e, i, o, s);
    }
  }
  return o.memo(l);
}
function ft(t) {
  for (var n = [], o = 1; o < arguments.length; o++) n[o - 1] = arguments[o];
   false && 0;
  var r = ae(ct.apply(void 0, e([t], n, !1))),
    s = z(r);
  return new Ye(s, r);
}
function mt(e) {
  var n = o.forwardRef(function (n, r) {
    var s = I(n, o.useContext(Qe), e.defaultProps);
    return  false && 0, o.createElement(e, t({}, n, {
      theme: s,
      ref: r
    }));
  });
  return n.displayName = "WithTheme(".concat(B(e), ")"), oe(n, e);
}
var yt = function () {
    function e() {
      var e = this;
      this._emitSheetCSS = function () {
        var t = e.instance.toString(),
          n = _e(),
          o = ae([n && 'nonce="'.concat(n, '"'), "".concat(f, '="true"'), "".concat(y, '="').concat(v, '"')].filter(Boolean), " ");
        return "<style ".concat(o, ">").concat(t, "</style>");
      }, this.getStyleTags = function () {
        if (e.sealed) throw he(2);
        return e._emitSheetCSS();
      }, this.getStyleElement = function () {
        var n;
        if (e.sealed) throw he(2);
        var r = ((n = {})[f] = "", n[y] = v, n.dangerouslySetInnerHTML = {
            __html: e.instance.toString()
          }, n),
          s = _e();
        return s && (r.nonce = s), [react.createElement("style", __assign({}, r, {
          key: "sc-0-0"
        }))];
      }, this.seal = function () {
        e.sealed = !0;
      }, this.instance = new Te({
        isServer: !0
      }), this.sealed = !1;
    }
    return e.prototype.collectStyles = function (e) {
      if (this.sealed) throw he(2);
      return react.createElement(Ge, {
        sheet: this.instance
      }, e);
    }, e.prototype.interleaveWithNodeStream = function (e) {
      throw he(3);
    }, e;
  }(),
  vt = {
    StyleSheet: Te,
    mainSheet: Fe
  };
 false && 0;
var gt = "__sc-".concat(f, "__");
 false && (0);

// EXTERNAL MODULE: ./node_modules/moment-timezone/index.js
var moment_timezone = __webpack_require__(348);
// EXTERNAL MODULE: ./node_modules/react/jsx-runtime.js
var jsx_runtime = __webpack_require__(579);
;// CONCATENATED MODULE: ./src/components/CommentSection/SummaryContext.jsx
const SummaryContext_SummaryContext=/*#__PURE__*/(/* unused pure expression or super */ null && (React.createContext()));const SummaryContext_SummaryProvider=_ref=>{let{children}=_ref;const[summaryUpdated,setSummaryUpdated]=React.useState(false);const[commentDeleted,setCommentDeleted]=React.useState(false);const[reviewUpdated,setReviewUpdated]=React.useState(false);const[commentUpvoted,setCommentUpvoted]=React.useState(false);const resetAll=()=>{setSummaryUpdated(false);setCommentDeleted(false);setReviewUpdated(false);setCommentUpvoted(false);};const updateSummary=()=>{setSummaryUpdated(true);};const updateCommentDeleted=()=>{setCommentDeleted(true);};const updateReview=()=>{setReviewUpdated(true);};const updateCommentUpvoted=()=>{setCommentUpvoted(true);};return/*#__PURE__*/_jsx(SummaryContext_SummaryContext.Provider,{value:{summaryUpdated,updateSummary,commentDeleted,updateCommentDeleted,reviewUpdated,updateReview,commentUpvoted,updateCommentUpvoted,resetAll},children:children});};/* harmony default export */ const CommentSection_SummaryContext = ((/* unused pure expression or super */ null && (SummaryContext_SummaryContext)));
;// CONCATENATED MODULE: ./src/components/CommentBox/Comment.jsx
var _templateObject,_templateObject2,_templateObject3,_templateObject4,_templateObject5,_templateObject6,_templateObject7,_templateObject8,_templateObject9,_templateObject10,_templateObject11,_templateObject12,_templateObject13,_templateObject14,_templateObject15,_templateObject16,_templateObject17,_templateObject18,_templateObject19,_templateObject20,_templateObject21,_templateObject22,_templateObject23,_templateObject24,_templateObject25,_templateObject26,_templateObject27,_templateObject28;const CommentContainer=pt.div(_templateObject||(_templateObject=_taggedTemplateLiteral(["\n  display: flex;\n  align-items: flex-start;\n  padding: 5px;\n  border-radius: 8px;\n  background-color: ","; //individual (not surrounding) comment background \n  opacity: ","; \n\n  position: relative;\n"])),props=>props.isReplyingTo?'#9bbcc7':props.isCombined?'#F2F2F2':'#F2F2F2',props=>props.isDragging?'1':'1');const UserLogo=pt.div(_templateObject2||(_templateObject2=_taggedTemplateLiteral(["\n  margin-right: 10px;\n  width: 50px;\n  height: 50px;\n  background-color: #E2E2E2;\n  border-radius: 50%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 24px;\n  color: black;\n  font-weight: bold;\n  margin-top: 10px;\n  flex-shrink: 0;\n"])));const CommentContent=pt.div(_templateObject3||(_templateObject3=_taggedTemplateLiteral(["\n  flex-grow: 1;\n  color: ",";\n"])),props=>props.isCombined?'inherit':'black');const CommentText=pt.p(_templateObject4||(_templateObject4=_taggedTemplateLiteral(["\n  margin: 0 0 10px 0;\n  margin-top: 10px;\n"])));const CommentDetails=pt.div(_templateObject5||(_templateObject5=_taggedTemplateLiteral(["\n  display: flex;\n  align-items: center;\n  margin-top: 10px;\n  font-size: 12px;\n  color: #555;\n"])));const CommentAuthor=pt.span(_templateObject6||(_templateObject6=_taggedTemplateLiteral(["\n  font-weight: bold;\n"])));const DotSeparator=pt.span(_templateObject7||(_templateObject7=_taggedTemplateLiteral(["\n  margin: 0 5px;\n"])));const CommentActions=pt.div(_templateObject8||(_templateObject8=_taggedTemplateLiteral(["\n  display: flex;\n  margin-top: 5px;\n  justify-content: flex-start;\n\n  .upvote-button {\n    order: ","; /* Order based on the presence of the reply button */\n  }\n\n  .reply-button {\n    order: 1; /* Always place the reply button first if it exists */\n  }\n\n  .ellipsis-button {\n    order: 3; /* Keep ellipsis at the end */\n  }\n"])),props=>props.hasReplyButton?'2':'1');const ReplyButton=pt.button(_templateObject9||(_templateObject9=_taggedTemplateLiteral(["\n  background: none;\n  border: none;\n  color: black;\n  font-size: 14px;\n  display: flex;\n  align-items: center;\n  padding: 1px;\n  margin-right: 5px;\n\n  opacity: ",";\n  cursor: ",";\n\n  &:hover {\n    text-decoration: underline;\n  }\n"])),props=>props.isDisabled?0.5:1,props=>props.isDisabled?'not-allowed':'pointer');const UpvoteButton=pt.button(_templateObject10||(_templateObject10=_taggedTemplateLiteral(["\n  background: none;\n  border: none;\n  color: black;\n  font-size: 14px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 4px;\n\n  opacity: ",";\n  cursor: ",";\n\n  &.active {\n    color: black; \n  }\n"])),props=>props.isDisabled?0.5:1,props=>props.isDisabled?'not-allowed':'pointer');const IconWrapper=pt.span(_templateObject11||(_templateObject11=_taggedTemplateLiteral(["\n  display: flex;\n  align-items: center;\n  margin-right: 5px;\n  justify-content: flex-end;\n\n  svg {\n    margin-right: 5px; // Add this line to create space between the icon and the number\n  }\n"])));const DraggableIndicator=pt.div(_templateObject12||(_templateObject12=_taggedTemplateLiteral(["\n  position: absolute;\n  top: 0;\n  right: 0;\n  width: 10px;\n  height: 100%;\n  background-color: #5D6BE5;\n  border-top-right-radius: 5px;\n  border-bottom-right-radius: 5px;\n"])));const EllipsisButton=pt.button(_templateObject13||(_templateObject13=_taggedTemplateLiteral(["\n  background: none;\n  border: none;\n  font-size: 14px;\n  display: flex;\n  align-items: center;\n  padding: 4px;\n\n  opacity: ",";\n  cursor: ",";\n"])),props=>props.isDisabled?0.5:1,props=>props.isDisabled?'not-allowed':'pointer');const MenuPopup=pt.div(_templateObject14||(_templateObject14=_taggedTemplateLiteral(["\n  position: absolute;\n  right: 0;\n  top: 100%;\n  transform: translateY(5px);\n  background-color: white;\n  border: 1px solid #ccc;\n  border-radius: 4px;\n  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);\n  z-index: 10;\n"])));const MenuItem=pt.div(_templateObject15||(_templateObject15=_taggedTemplateLiteral(["\n  padding: 8px 12px;\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n\n  &:hover {\n    background-color: #f5f5f5;\n  }\n\n  svg {\n    margin-right: 8px;\n  }\n"])));const EditForm=pt.form(_templateObject16||(_templateObject16=_taggedTemplateLiteral(["\n  margin-top: 10px;\n"])));const EditInput=pt.textarea(_templateObject17||(_templateObject17=_taggedTemplateLiteral(["\n  width: 95%;\n  padding: 8px;\n  border: 1px solid #ccc;\n  border-radius: 4px;\n  resize: vertical;\n  min-height: 60px;\n"])));const EditButtons=pt.div(_templateObject18||(_templateObject18=_taggedTemplateLiteral(["\n  display: flex;\n  justify-content: flex-end;\n  margin-top: 8px;\n  padding-right: 20px; // check \n"])));const CancelButton=pt.button(_templateObject19||(_templateObject19=_taggedTemplateLiteral(["\n  background-color: #f5f5f5;\n  border: 1px solid #ccc;\n  border-radius: 4px;\n  padding: 6px 12px;\n  margin-right: 8px;\n  cursor: pointer;\n"])));const SaveButton=pt.button(_templateObject20||(_templateObject20=_taggedTemplateLiteral(["\n  background-color: #4CAF50;\n  color: white;\n  border: none;\n  border-radius: 4px;\n  padding: 6px 12px;\n  cursor: pointer;\n"])));const ModalOverlay=pt.div(_templateObject21||(_templateObject21=_taggedTemplateLiteral(["\n  position: fixed;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  background-color: rgba(0, 0, 0, 0.5);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 20;\n"])));const ModalContent=pt.div(_templateObject22||(_templateObject22=_taggedTemplateLiteral(["\n  background-color: white;\n  padding: 20px;\n  border-radius: 8px;\n  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);\n  width: 400px;\n  max-width: 100%;\n"])));const ModalHeader=pt.h2(_templateObject23||(_templateObject23=_taggedTemplateLiteral(["\n  text-align: left;\n  margin-top: 0;\n"])));const ModalText=pt.p(_templateObject24||(_templateObject24=_taggedTemplateLiteral(["\n  text-align: left;\n  margin-bottom: 20px;\n"])));const ModalButtons=pt.div(_templateObject25||(_templateObject25=_taggedTemplateLiteral(["\n  display: flex;\n  justify-content: flex-end;\n  gap: 10px;\n"])));const ConfirmButton=pt.button(_templateObject26||(_templateObject26=_taggedTemplateLiteral(["\n  background-color: #D32F2F;\n  color: white;\n  border: none;\n  border-radius: 4px;\n  padding: 10px 20px;\n  cursor: pointer;\n"])));const CancelModalButton=pt.button(_templateObject27||(_templateObject27=_taggedTemplateLiteral(["\n  background-color: #f5f5f5;\n  border: 1px solid #ccc;\n  border-radius: 4px;\n  padding: 10px 20px;\n  cursor: pointer;\n"])));const FloatingMessage=pt.div(_templateObject28||(_templateObject28=_taggedTemplateLiteral(["\n  position: fixed;\n  bottom: 40px;\n  right: 380px;\n  background-color: rgba(0, 0, 0, 0.7);\n  color: white;\n  padding: 10px 20px;\n  border-radius: 5px;\n  z-index: 10000;\n  opacity: ",";\n  transition: opacity 0.3s ease-in-out;\n"])),_ref=>{let{show}=_ref;return show?1:0;});const Comment_Comment=_ref2=>{let{articleId,threadId,comment,isCombined,isDragging,isReplyDisabled,userId,onReplyClick,level,isReplyingTo,isReplyEnabled,allComments}=_ref2;if(!comment){return null;}const{updateCommentDeleted,updateCommentUpvoted}=React.useContext(SummaryContext);const[upvotes,setUpvotes]=useState(comment.upvotes||[]);const[hasUpvoted,setHasUpvoted]=useState(Array.isArray(comment.upvotes)&&comment.upvotes.includes(userId));const[isReplying,setIsReplying]=useState(false);const[isMenuOpen,setIsMenuOpen]=useState(false);const[isEditing,setIsEditing]=useState(false);const[editedText,setEditedText]=useState(comment.text);const[isDeleteModalOpen,setIsDeleteModalOpen]=useState(false);const menuPopupRef=useRef(null);const ellipsisButtonRef=useRef(null);const[floatingMessage,setFloatingMessage]=useState(null);const[showFloatingMessage,setShowFloatingMessage]=useState(false);const authorInitial=comment.author?comment.author.charAt(0).toUpperCase():'A';const formattedTimestamp=moment.utc(comment.timestamp).tz('Asia/Seoul').format('MMMM D, YYYY h:mm A z');const addUpvote=async()=>{if(!isReplyDisabled){const updatedUpvotes=Array.isArray(comment.upvotes)&&comment.upvotes.includes(userId)?comment.upvotes.filter(id=>id!==userId):Array.isArray(comment.upvotes)?[...comment.upvotes,userId]:[userId];setHasUpvoted(!hasUpvoted);setUpvotes(updatedUpvotes);try{await axios.put("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/comments/").concat(threadId,"/").concat(comment.id),{upvotes:updatedUpvotes});}catch(error){console.error('Error updating upvotes:',error);}updateCommentUpvoted();}};const handleReplyClick=()=>{if(!isReplyDisabled){setIsReplying(true);onReplyClick(comment.id);}};const handleCancelReply=()=>{setIsReplying(false);};const handleEllipsisClick=()=>{if(!isReplyDisabled){setIsMenuOpen(!isMenuOpen);}};useEffect(()=>{const handleClickOutside=event=>{if(isReplying&&!event.target.closest(".comment-container")&&!event.target.closest(".comment-input")){handleCancelReply();}};document.addEventListener("mousedown",handleClickOutside);return()=>{document.removeEventListener("mousedown",handleClickOutside);};},[isReplying]);useEffect(()=>{const handleClickOutsideMenu=event=>{if(isMenuOpen&&menuPopupRef.current&&!menuPopupRef.current.contains(event.target)&&!ellipsisButtonRef.current.contains(event.target)){setIsMenuOpen(false);}};document.addEventListener("mousedown",handleClickOutsideMenu);return()=>{document.removeEventListener("mousedown",handleClickOutsideMenu);};},[isMenuOpen]);useEffect(()=>{if(floatingMessage){setShowFloatingMessage(true);const timer=setTimeout(()=>{setShowFloatingMessage(false);},5000);return()=>clearTimeout(timer);}},[floatingMessage]);const handleEdit=()=>{setIsEditing(true);setIsMenuOpen(false);};const handleSaveEdit=async e=>{e.preventDefault();try{await axios.put("".concat("https://redesign-online-discourse.vercel.app","/api/comments/").concat(comment.id),{text:editedText});comment.text=editedText;setIsEditing(false);}catch(error){console.error('Error updating comment:',error);}};const handleDelete=async()=>{const hasDependencies=allComments.some(c=>c.children_id===comment.id||c.cluster_id===comment.id);if(hasDependencies){setFloatingMessage('Cannot delete comment. It has replies or is part of a cluster.');closeDeleteModal();return;}try{await axios.delete("".concat("https://redesign-online-discourse.vercel.app","/api/comments/").concat(comment.id));updateCommentDeleted();}catch(error){console.error('Error deleting comment:',error);}};const openDeleteModal=()=>{setIsDeleteModalOpen(true);};const closeDeleteModal=()=>{setIsDeleteModalOpen(false);};return/*#__PURE__*/_jsxs(CommentContainer,{isDragging:isDragging,isReplyingTo:isReplyingTo,isCombined:isCombined,children:[/*#__PURE__*/_jsx(UserLogo,{children:authorInitial}),/*#__PURE__*/_jsxs(CommentContent,{isCombined:isCombined,isDragging:isDragging,children:[/*#__PURE__*/_jsxs(CommentDetails,{children:[/*#__PURE__*/_jsx(CommentAuthor,{children:comment.author}),/*#__PURE__*/_jsx(DotSeparator,{children:"\u2022"}),/*#__PURE__*/_jsx("span",{children:formattedTimestamp})]}),isEditing?/*#__PURE__*/_jsxs(EditForm,{onSubmit:handleSaveEdit,children:[/*#__PURE__*/_jsx(EditInput,{value:editedText,onChange:e=>setEditedText(e.target.value)}),/*#__PURE__*/_jsxs(EditButtons,{children:[/*#__PURE__*/_jsx(CancelButton,{onClick:()=>setIsEditing(false),children:"Cancel"}),/*#__PURE__*/_jsx(SaveButton,{type:"submit",children:"Save Edit"})]})]}):/*#__PURE__*/_jsx(CommentText,{children:comment.text}),/*#__PURE__*/_jsxs(CommentActions,{hasReplyButton:!isReplyDisabled&&comment.children_id===null,children:[!isReplyDisabled&&comment.children_id===null&&/*#__PURE__*/_jsxs(ReplyButton,{onClick:handleReplyClick,className:"reply-button",children:[/*#__PURE__*/_jsx(AiOutlineMessage,{style:{marginRight:'5px'}}),"Reply"]}),/*#__PURE__*/_jsx(UpvoteButton,{onClick:addUpvote,className:"upvote-button ".concat(hasUpvoted?'active':''),isDisabled:isReplyDisabled,children:/*#__PURE__*/_jsxs(IconWrapper,{children:[hasUpvoted?/*#__PURE__*/_jsx(AiFillLike,{}):/*#__PURE__*/_jsx(AiOutlineLike,{})," ",upvotes.length||0," "]})}),/*#__PURE__*/_jsx(EllipsisButton,{ref:ellipsisButtonRef,className:"ellipsis-button",onClick:handleEllipsisClick,isDisabled:isReplyDisabled,children:/*#__PURE__*/_jsxs(IconWrapper,{children:[" ",/*#__PURE__*/_jsx(AiOutlineEllipsis,{})," "]})}),isMenuOpen&&/*#__PURE__*/_jsxs(MenuPopup,{ref:menuPopupRef,className:"menu-popup",children:[comment.author===userId&&/*#__PURE__*/_jsxs(_Fragment,{children:[/*#__PURE__*/_jsxs(MenuItem,{onClick:handleEdit,children:[/*#__PURE__*/_jsx(AiOutlineEdit,{})," Edit comment"]}),/*#__PURE__*/_jsxs(MenuItem,{onClick:openDeleteModal,children:[/*#__PURE__*/_jsx(AiOutlineDelete,{})," Delete comment"]})]}),comment.author!==userId&&/*#__PURE__*/_jsxs(MenuItem,{children:[/*#__PURE__*/_jsx(AiOutlineWarning,{})," Report comment"]})]})]})]}),isDeleteModalOpen&&/*#__PURE__*/_jsx(ModalOverlay,{children:/*#__PURE__*/_jsxs(ModalContent,{children:[/*#__PURE__*/_jsx(ModalHeader,{children:"Delete comment?"}),/*#__PURE__*/_jsx(ModalText,{children:"Are you sure you want to delete your comment? You can't undo this."}),/*#__PURE__*/_jsxs(ModalButtons,{children:[/*#__PURE__*/_jsx(CancelModalButton,{onClick:closeDeleteModal,children:"Cancel"}),/*#__PURE__*/_jsx(ConfirmButton,{onClick:handleDelete,children:"Delete"})]})]})}),floatingMessage&&/*#__PURE__*/_jsx(FloatingMessage,{show:showFloatingMessage,children:floatingMessage})]});};/* harmony default export */ const CommentBox_Comment = ((/* unused pure expression or super */ null && (Comment_Comment)));
;// CONCATENATED MODULE: ./src/components/CommentBox/CommentNew.jsx
var CommentNew_templateObject,CommentNew_templateObject2,CommentNew_templateObject3,CommentNew_templateObject4,CommentNew_templateObject5,CommentNew_templateObject6,CommentNew_templateObject7,CommentNew_templateObject8,CommentNew_templateObject9,CommentNew_templateObject10,CommentNew_templateObject11,CommentNew_templateObject12,CommentNew_templateObject13,CommentNew_templateObject14,CommentNew_templateObject15,CommentNew_templateObject16,CommentNew_templateObject17,CommentNew_templateObject18,CommentNew_templateObject19,CommentNew_templateObject20,CommentNew_templateObject21,CommentNew_templateObject22,CommentNew_templateObject23,CommentNew_templateObject24,CommentNew_templateObject25,CommentNew_templateObject26,CommentNew_templateObject27,CommentNew_templateObject28;const CommentNew_CommentContainer=pt.div(CommentNew_templateObject||(CommentNew_templateObject=_taggedTemplateLiteral(["\n  display: flex;\n  align-items: flex-start;\n  padding: 5px;\n  border-radius: 8px;\n  background-color: ","; //individual (not surrounding) comment background \n  opacity: ","; \n\n  position: relative;\n"])),props=>props.isReplyingTo?'#9bbcc7':props.isCombined?'#F2F2F2':'#F2F2F2',props=>props.isDragging?'1':'1');const CommentNew_UserLogo=pt.div(CommentNew_templateObject2||(CommentNew_templateObject2=_taggedTemplateLiteral(["\n  margin-right: 10px;\n  width: 50px;\n  height: 50px;\n  background-color: #E2E2E2;\n  border-radius: 50%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 24px;\n  color: black;\n  font-weight: bold;\n  margin-top: 10px;\n  flex-shrink: 0;\n"])));const CommentNew_CommentContent=pt.div(CommentNew_templateObject3||(CommentNew_templateObject3=_taggedTemplateLiteral(["\n  flex-grow: 1;\n  color: ",";\n"])),props=>props.isCombined?'inherit':'black');const CommentNew_CommentText=pt.p(CommentNew_templateObject4||(CommentNew_templateObject4=_taggedTemplateLiteral(["\n  margin: 0 0 10px 0;\n  margin-top: 10px;\n"])));const CommentNew_CommentDetails=pt.div(CommentNew_templateObject5||(CommentNew_templateObject5=_taggedTemplateLiteral(["\n  display: flex;\n  align-items: center;\n  margin-top: 10px;\n  font-size: 12px;\n  color: #555;\n"])));const CommentNew_CommentAuthor=pt.span(CommentNew_templateObject6||(CommentNew_templateObject6=_taggedTemplateLiteral(["\n  font-weight: bold;\n"])));const CommentNew_DotSeparator=pt.span(CommentNew_templateObject7||(CommentNew_templateObject7=_taggedTemplateLiteral(["\n  margin: 0 5px;\n"])));const CommentNew_CommentActions=pt.div(CommentNew_templateObject8||(CommentNew_templateObject8=_taggedTemplateLiteral(["\n  display: flex;\n  margin-top: 5px;\n  justify-content: flex-start;\n\n  .upvote-button {\n    order: ","; /* Order based on the presence of the reply button */\n  }\n\n  .reply-button {\n    order: 1; /* Always place the reply button first if it exists */\n  }\n\n  .ellipsis-button {\n    order: 3; /* Keep ellipsis at the end */\n  }\n"])),props=>props.hasReplyButton?'2':'1');const CommentNew_ReplyButton=pt.button(CommentNew_templateObject9||(CommentNew_templateObject9=_taggedTemplateLiteral(["\n  background: none;\n  border: none;\n  color: black;\n  font-size: 14px;\n  display: flex;\n  align-items: center;\n  padding: 1px;\n  margin-right: 5px;\n\n  opacity: ",";\n  cursor: ",";\n\n  &:hover {\n    text-decoration: underline;\n  }\n"])),props=>props.isDisabled?0.5:1,props=>props.isDisabled?'not-allowed':'pointer');const CommentNew_UpvoteButton=pt.button(CommentNew_templateObject10||(CommentNew_templateObject10=_taggedTemplateLiteral(["\n  background: none;\n  border: none;\n  color: black;\n  font-size: 14px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 4px;\n\n  opacity: ",";\n  cursor: ",";\n\n  &.active {\n    color: black; \n  }\n"])),props=>props.isDisabled?0.5:1,props=>props.isDisabled?'not-allowed':'pointer');const CommentNew_IconWrapper=pt.span(CommentNew_templateObject11||(CommentNew_templateObject11=_taggedTemplateLiteral(["\n  display: flex;\n  align-items: center;\n  margin-right: 5px;\n  justify-content: flex-end;\n\n  svg {\n    margin-right: 5px; // Add this line to create space between the icon and the number\n  }\n"])));const CommentNew_DraggableIndicator=pt.div(CommentNew_templateObject12||(CommentNew_templateObject12=_taggedTemplateLiteral(["\n  position: absolute;\n  top: 0;\n  right: 0;\n  width: 10px;\n  height: 100%;\n  background-color: #5D6BE5;\n  border-top-right-radius: 5px;\n  border-bottom-right-radius: 5px;\n"])));const CommentNew_EllipsisButton=pt.button(CommentNew_templateObject13||(CommentNew_templateObject13=_taggedTemplateLiteral(["\n  background: none;\n  border: none;\n  font-size: 14px;\n  display: flex;\n  align-items: center;\n  padding: 4px;\n\n  opacity: ",";\n  cursor: ",";\n"])),props=>props.isDisabled?0.5:1,props=>props.isDisabled?'not-allowed':'pointer');const CommentNew_MenuPopup=pt.div(CommentNew_templateObject14||(CommentNew_templateObject14=_taggedTemplateLiteral(["\n  position: absolute;\n  right: 0;\n  top: 100%;\n  transform: translateY(5px);\n  background-color: white;\n  border: 1px solid #ccc;\n  border-radius: 4px;\n  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);\n  z-index: 10;\n"])));const CommentNew_MenuItem=pt.div(CommentNew_templateObject15||(CommentNew_templateObject15=_taggedTemplateLiteral(["\n  padding: 8px 12px;\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n\n  &:hover {\n    background-color: #f5f5f5;\n  }\n\n  svg {\n    margin-right: 8px;\n  }\n"])));const CommentNew_EditForm=pt.form(CommentNew_templateObject16||(CommentNew_templateObject16=_taggedTemplateLiteral(["\n  margin-top: 10px;\n"])));const CommentNew_EditInput=pt.textarea(CommentNew_templateObject17||(CommentNew_templateObject17=_taggedTemplateLiteral(["\n  width: 95%;\n  padding: 8px;\n  border: 1px solid #ccc;\n  border-radius: 4px;\n  resize: vertical;\n  min-height: 60px;\n"])));const CommentNew_EditButtons=pt.div(CommentNew_templateObject18||(CommentNew_templateObject18=_taggedTemplateLiteral(["\n  display: flex;\n  justify-content: flex-end;\n  margin-top: 8px;\n  padding-right: 20px; // check \n"])));const CommentNew_CancelButton=pt.button(CommentNew_templateObject19||(CommentNew_templateObject19=_taggedTemplateLiteral(["\n  background-color: #f5f5f5;\n  border: 1px solid #ccc;\n  border-radius: 4px;\n  padding: 6px 12px;\n  margin-right: 8px;\n  cursor: pointer;\n"])));const CommentNew_SaveButton=pt.button(CommentNew_templateObject20||(CommentNew_templateObject20=_taggedTemplateLiteral(["\n  background-color: #4CAF50;\n  color: white;\n  border: none;\n  border-radius: 4px;\n  padding: 6px 12px;\n  cursor: pointer;\n"])));const CommentNew_ModalOverlay=pt.div(CommentNew_templateObject21||(CommentNew_templateObject21=_taggedTemplateLiteral(["\n  position: fixed;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  background-color: rgba(0, 0, 0, 0.5);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 20;\n"])));const CommentNew_ModalContent=pt.div(CommentNew_templateObject22||(CommentNew_templateObject22=_taggedTemplateLiteral(["\n  background-color: white;\n  padding: 20px;\n  border-radius: 8px;\n  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);\n  width: 400px;\n  max-width: 100%;\n"])));const CommentNew_ModalHeader=pt.h2(CommentNew_templateObject23||(CommentNew_templateObject23=_taggedTemplateLiteral(["\n  text-align: left;\n  margin-top: 0;\n"])));const CommentNew_ModalText=pt.p(CommentNew_templateObject24||(CommentNew_templateObject24=_taggedTemplateLiteral(["\n  text-align: left;\n  margin-bottom: 20px;\n"])));const CommentNew_ModalButtons=pt.div(CommentNew_templateObject25||(CommentNew_templateObject25=_taggedTemplateLiteral(["\n  display: flex;\n  justify-content: flex-end;\n  gap: 10px;\n"])));const CommentNew_ConfirmButton=pt.button(CommentNew_templateObject26||(CommentNew_templateObject26=_taggedTemplateLiteral(["\n  background-color: #D32F2F;\n  color: white;\n  border: none;\n  border-radius: 4px;\n  padding: 10px 20px;\n  cursor: pointer;\n"])));const CommentNew_CancelModalButton=pt.button(CommentNew_templateObject27||(CommentNew_templateObject27=_taggedTemplateLiteral(["\n  background-color: #f5f5f5;\n  border: 1px solid #ccc;\n  border-radius: 4px;\n  padding: 10px 20px;\n  cursor: pointer;\n"])));const CommentNew_FloatingMessage=pt.div(CommentNew_templateObject28||(CommentNew_templateObject28=_taggedTemplateLiteral(["\n  position: fixed;\n  bottom: 40px;\n  right: 380px;\n  background-color: rgba(0, 0, 0, 0.7);\n  color: white;\n  padding: 10px 20px;\n  border-radius: 5px;\n  z-index: 10000;\n  opacity: ",";\n  transition: opacity 0.3s ease-in-out;\n"])),_ref=>{let{show}=_ref;return show?1:0;});const CommentNew_CommentNew=_ref2=>{let{articleId,threadId,comment,isCombined,isDragging,isReplyDisabled,userId,onReplyClick,level,isReplyingTo,isReplyEnabled,allComments}=_ref2;if(!comment){return null;}const{updateCommentDeleted,updateCommentUpvoted}=React.useContext(SummaryContext);const[upvotes,setUpvotes]=useState(comment.upvotes||[]);const[hasUpvoted,setHasUpvoted]=useState(Array.isArray(comment.upvotes)&&comment.upvotes.includes(userId));const[isReplying,setIsReplying]=useState(false);const[isMenuOpen,setIsMenuOpen]=useState(false);const[isEditing,setIsEditing]=useState(false);const[editedText,setEditedText]=useState(comment.text);const[isDeleteModalOpen,setIsDeleteModalOpen]=useState(false);const menuPopupRef=useRef(null);const ellipsisButtonRef=useRef(null);const[floatingMessage,setFloatingMessage]=useState(null);const[showFloatingMessage,setShowFloatingMessage]=useState(false);const authorInitial=comment.author?comment.author.charAt(0).toUpperCase():'A';const formattedTimestamp=moment.utc(comment.timestamp).tz('Asia/Seoul').format('MMMM D, YYYY h:mm A z');const addUpvote=async()=>{if(!isReplyDisabled){const updatedUpvotes=Array.isArray(comment.upvotes)&&comment.upvotes.includes(userId)?comment.upvotes.filter(id=>id!==userId):Array.isArray(comment.upvotes)?[...comment.upvotes,userId]:[userId];setHasUpvoted(!hasUpvoted);setUpvotes(updatedUpvotes);try{await axios.put("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/comments/").concat(threadId,"/").concat(comment.id),{upvotes:updatedUpvotes});}catch(error){console.error('Error updating upvotes:',error);}updateCommentUpvoted();}};const handleReplyClick=()=>{if(!isReplyDisabled){setIsReplying(true);onReplyClick(comment.id);}};const handleCancelReply=()=>{setIsReplying(false);};const handleEllipsisClick=()=>{if(!isReplyDisabled){setIsMenuOpen(!isMenuOpen);}};useEffect(()=>{const handleClickOutside=event=>{if(isReplying&&!event.target.closest(".comment-container")&&!event.target.closest(".comment-input")){handleCancelReply();}};document.addEventListener("mousedown",handleClickOutside);return()=>{document.removeEventListener("mousedown",handleClickOutside);};},[isReplying]);useEffect(()=>{const handleClickOutsideMenu=event=>{if(isMenuOpen&&menuPopupRef.current&&!menuPopupRef.current.contains(event.target)&&!ellipsisButtonRef.current.contains(event.target)){setIsMenuOpen(false);}};document.addEventListener("mousedown",handleClickOutsideMenu);return()=>{document.removeEventListener("mousedown",handleClickOutsideMenu);};},[isMenuOpen]);useEffect(()=>{if(floatingMessage){setShowFloatingMessage(true);const timer=setTimeout(()=>{setShowFloatingMessage(false);},5000);return()=>clearTimeout(timer);}},[floatingMessage]);const handleEdit=()=>{setIsEditing(true);setIsMenuOpen(false);};const handleSaveEdit=async e=>{e.preventDefault();try{await axios.put("".concat("https://redesign-online-discourse.vercel.app","/api/comments/").concat(comment.id),{text:editedText});comment.text=editedText;setIsEditing(false);}catch(error){console.error('Error updating comment:',error);}};const handleDelete=async()=>{const hasDependencies=allComments.some(c=>c.children_id===comment.id||c.cluster_id===comment.id);if(hasDependencies){setFloatingMessage('Cannot delete comment. It has replies or is part of a cluster.');closeDeleteModal();return;}try{await axios.delete("".concat("https://redesign-online-discourse.vercel.app","/api/comments/").concat(comment.id));updateCommentDeleted();}catch(error){console.error('Error deleting comment:',error);}};const openDeleteModal=()=>{setIsDeleteModalOpen(true);};const closeDeleteModal=()=>{setIsDeleteModalOpen(false);};return/*#__PURE__*/_jsxs(CommentNew_CommentContainer,{isDragging:isDragging,isReplyingTo:isReplyingTo,isCombined:isCombined,children:[/*#__PURE__*/_jsx(CommentNew_UserLogo,{children:authorInitial}),/*#__PURE__*/_jsxs(CommentNew_CommentContent,{isCombined:isCombined,isDragging:isDragging,children:[/*#__PURE__*/_jsxs(CommentNew_CommentDetails,{children:[/*#__PURE__*/_jsx(CommentNew_CommentAuthor,{children:comment.author}),/*#__PURE__*/_jsx(CommentNew_DotSeparator,{children:"\u2022"}),/*#__PURE__*/_jsx("span",{children:formattedTimestamp})]}),isEditing?/*#__PURE__*/_jsxs(CommentNew_EditForm,{onSubmit:handleSaveEdit,children:[/*#__PURE__*/_jsx(CommentNew_EditInput,{value:editedText,onChange:e=>setEditedText(e.target.value)}),/*#__PURE__*/_jsxs(CommentNew_EditButtons,{children:[/*#__PURE__*/_jsx(CommentNew_CancelButton,{onClick:()=>setIsEditing(false),children:"Cancel"}),/*#__PURE__*/_jsx(CommentNew_SaveButton,{type:"submit",children:"Save Edit"})]})]}):/*#__PURE__*/_jsx(CommentNew_CommentText,{children:comment.text}),/*#__PURE__*/_jsxs(CommentNew_CommentActions,{hasReplyButton:!isReplyDisabled&&comment.children_id===null,children:[/*#__PURE__*/_jsx(CommentNew_UpvoteButton,{onClick:addUpvote,className:"upvote-button ".concat(hasUpvoted?'active':''),isDisabled:isReplyDisabled,children:/*#__PURE__*/_jsxs(CommentNew_IconWrapper,{children:[hasUpvoted?/*#__PURE__*/_jsx(AiFillLike,{}):/*#__PURE__*/_jsx(AiOutlineLike,{})," ",upvotes.length||0," "]})}),/*#__PURE__*/_jsx(CommentNew_EllipsisButton,{ref:ellipsisButtonRef,className:"ellipsis-button",onClick:handleEllipsisClick,isDisabled:isReplyDisabled,children:/*#__PURE__*/_jsxs(CommentNew_IconWrapper,{children:[" ",/*#__PURE__*/_jsx(AiOutlineEllipsis,{})," "]})}),isMenuOpen&&/*#__PURE__*/_jsxs(CommentNew_MenuPopup,{ref:menuPopupRef,className:"menu-popup",children:[comment.author===userId&&/*#__PURE__*/_jsxs(_Fragment,{children:[/*#__PURE__*/_jsxs(CommentNew_MenuItem,{onClick:handleEdit,children:[/*#__PURE__*/_jsx(AiOutlineEdit,{})," Edit comment"]}),/*#__PURE__*/_jsxs(CommentNew_MenuItem,{onClick:openDeleteModal,children:[/*#__PURE__*/_jsx(AiOutlineDelete,{})," Delete comment"]})]}),comment.author!==userId&&/*#__PURE__*/_jsxs(CommentNew_MenuItem,{children:[/*#__PURE__*/_jsx(AiOutlineWarning,{})," Report comment"]})]})]})]}),isDeleteModalOpen&&/*#__PURE__*/_jsx(CommentNew_ModalOverlay,{children:/*#__PURE__*/_jsxs(CommentNew_ModalContent,{children:[/*#__PURE__*/_jsx(CommentNew_ModalHeader,{children:"Delete comment?"}),/*#__PURE__*/_jsx(CommentNew_ModalText,{children:"Are you sure you want to delete your comment? You can't undo this."}),/*#__PURE__*/_jsxs(CommentNew_ModalButtons,{children:[/*#__PURE__*/_jsx(CommentNew_CancelModalButton,{onClick:closeDeleteModal,children:"Cancel"}),/*#__PURE__*/_jsx(CommentNew_ConfirmButton,{onClick:handleDelete,children:"Delete"})]})]})}),floatingMessage&&/*#__PURE__*/_jsx(CommentNew_FloatingMessage,{show:showFloatingMessage,children:floatingMessage})]});};/* harmony default export */ const CommentBox_CommentNew = ((/* unused pure expression or super */ null && (CommentNew_CommentNew)));
;// CONCATENATED MODULE: ./src/components/CommentBox/CommentMap.jsx
var CommentMap_templateObject,CommentMap_templateObject2;const CommentMapContainer=pt.div(CommentMap_templateObject||(CommentMap_templateObject=_taggedTemplateLiteral(["\n  margin-bottom: 10px;\n  background-color: #F2F2F2;  // we have comment, it has cluster comment, cluster comment has background color set to this\n  border-radius: 5px;\n"])));const ReplyContainer=pt.div(CommentMap_templateObject2||(CommentMap_templateObject2=_taggedTemplateLiteral(["\n  border-left: 2px solid #ccc;\n  margin-left: 20px;\n  padding-left: 10px;\n"])));const CommentMap_CommentMap=_ref=>{let{articleId,threadId,comment,index,clusteredComments,childrenComments,userId,onReplyClick,isCombined,allComments,isReplyEnabled}=_ref;return/*#__PURE__*/_jsxs(CommentMapContainer,{children:[isReplyEnabled?/*#__PURE__*/_jsx(Comment,{articleId:articleId,threadId:threadId,comment:comment,isCombined:isCombined,isDragging:false,isReplyDisabled:false,userId:userId,onReplyClick:onReplyClick,allComments:allComments}):/*#__PURE__*/_jsx(CommentNew,{articleId:articleId,threadId:threadId,comment:comment,isCombined:isCombined,isDragging:false,isReplyDisabled:false,userId:userId,onReplyClick:onReplyClick,allComments:allComments}),childrenComments&&childrenComments.length>0&&/*#__PURE__*/_jsx(ReplyContainer,{children:childrenComments.map((childComment,childIndex)=>/*#__PURE__*/_jsx("div",{children:/*#__PURE__*/_jsx(CommentMap_CommentMap,{articleId:articleId,threadId:threadId,comment:childComment,index:childIndex,clusteredComments:[],childrenComments:[],userId:userId,isCombined:isCombined,onReplyClick:onReplyClick,allComments:allComments})},childComment.id))}),clusteredComments&&clusteredComments.length>0&&/*#__PURE__*/_jsx("div",{children:clusteredComments.map((child,childIndex)=>/*#__PURE__*/_jsx(CommentMap_CommentMap,{articleId:articleId,threadId:threadId,comment:child,index:childIndex,clusteredComments:child.clusteredComments||[],childrenComments:[],userId:userId,isReplyDisabled:false,onReplyClick:onReplyClick,isCombined:isCombined,allComments:allComments},child.id))})]});};/* harmony default export */ const CommentBox_CommentMap = ((/* unused pure expression or super */ null && (CommentMap_CommentMap)));
;// CONCATENATED MODULE: ./src/components/CommentBox/CommentBox.jsx
var CommentBox_templateObject,CommentBox_templateObject2,CommentBox_templateObject3,CommentBox_templateObject4;const CommentBoxContainer=pt.div(CommentBox_templateObject||(CommentBox_templateObject=_taggedTemplateLiteral(["\n  margin-bottom: 10px;\n  border-radius: 5px;\n  background-color: ",";\n"])),props=>props.isDragging?'lightblue':'#F2F2F2');const CommentBox_ReplyContainer=pt.div(CommentBox_templateObject2||(CommentBox_templateObject2=_taggedTemplateLiteral(["\n  border-left: 2px solid #ccc; \n  margin-left: 20px;\n  padding-left: 10px;\n"])));const CommentBox_DraggableIndicator=pt.div(CommentBox_templateObject3||(CommentBox_templateObject3=_taggedTemplateLiteral(["\n  position: absolute;\n  top: 0;\n  right: -5px;\n  width: 15px;\n  height: 100%;\n  background-color: #5D6BE5;\n  border-top-right-radius: 5px;\n  border-bottom-right-radius: 5px;\n"])));const CommentWrapper=pt.div(CommentBox_templateObject4||(CommentBox_templateObject4=_taggedTemplateLiteral(["\n  position: relative;\n"])));const CommentBox_CommentBox=_ref=>{let{articleId,threadId,comment,index,isReplyingTo,setReplyingTo,clusteredComments,childrenComments,userId,onReplyClick,level,pass,isSummary,isReplyEnabled}=_ref;const[allComments,setAllComments]=useState([]);const hasChildren=clusteredComments&&clusteredComments.length>0;useEffect(()=>{fetchComments();},[]);const fetchComments=async()=>{if(articleId===undefined||threadId===undefined){return;}try{const response=await axios.get("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/comments/").concat(threadId));setAllComments(response.data);}catch(error){return;}};const renderClusteredComments=()=>{return clusteredComments.map((child,childIndex)=>{const childrenComments=allComments.filter(comment=>comment.children_id===child.id);return/*#__PURE__*/_jsx("div",{children:/*#__PURE__*/_jsx(CommentMap,{articleId:articleId,threadId:threadId,comment:child,index:childIndex,clusteredComments:child.clusteredComments||[],childrenComments:childrenComments,userId:userId,isReplyDisabled:false,onReplyClick:onReplyClick,allComments:allComments,isReplyEnabled:false},child.id)},child.id);});};if(isSummary){return/*#__PURE__*/_jsxs(CommentBoxContainer,{style:{backgroundColor:hasChildren?'#F2F2F2':'#F2F2F2',padding:"6px"},children:[/*#__PURE__*/_jsxs(CommentWrapper,{children:[/*#__PURE__*/_jsx(CommentNew,{articleId:articleId,threadId:threadId,comment:comment,isCombined:false,isReplyDisabled:isReplyEnabled,userId:userId,onReplyClick:onReplyClick,level:level,isReplyEnabled:false,allComments:allComments}),childrenComments&&childrenComments.length>0&&/*#__PURE__*/_jsx(CommentBox_ReplyContainer,{children:childrenComments.map((childComment,childIndex)=>/*#__PURE__*/_jsx("div",{children:/*#__PURE__*/_jsx(CommentMap,{articleId:articleId,threadId:threadId,comment:childComment,index:childIndex,clusteredComments:[],childrenComments:[],userId:userId,onReplyClick:onReplyClick,isCombined:false,allComments:allComments})},childComment.id))})]}),clusteredComments&&clusteredComments.length>0&&/*#__PURE__*/_jsx("div",{children:renderClusteredComments()})]});}return/*#__PURE__*/_jsx(Droppable,{droppableId:"droppable-".concat(comment.id),children:(provided,snapshot)=>/*#__PURE__*/_jsxs(CommentBoxContainer,{ref:provided.innerRef,...provided.droppableProps,isDragging:snapshot.isDraggingOver,style:{padding:"6px"},children:[/*#__PURE__*/_jsx(Draggable,{draggableId:String(comment.id),index:index,isDragDisabled:level!=='L0',children:(provided,snapshot)=>/*#__PURE__*/_jsx("div",{ref:provided.innerRef,...provided.draggableProps,...provided.dragHandleProps,children:/*#__PURE__*/_jsxs(CommentWrapper,{children:[/*#__PURE__*/_jsx(Comment,{articleId:articleId,threadId:threadId,comment:comment,isCombined:false,isDragging:snapshot.isDragging,isReplyDisabled:false,userId:userId,onReplyClick:onReplyClick,level:level,isReplyingTo:isReplyingTo,setReplyingTo:setReplyingTo,isReplyEnabled:false,allComments:allComments}),!snapshot.isDragging&&/*#__PURE__*/_jsxs(_Fragment,{children:[childrenComments&&childrenComments.length>0&&/*#__PURE__*/_jsx(CommentBox_ReplyContainer,{children:childrenComments.map((childComment,childIndex)=>/*#__PURE__*/_jsx("div",{children:/*#__PURE__*/_jsx(CommentMap,{articleId:articleId,threadId:threadId,comment:childComment,index:childIndex,clusteredComments:[],childrenComments:[],userId:userId,onReplyClick:onReplyClick,isCombined:false,allComments:allComments})},childComment.id))}),clusteredComments&&clusteredComments.length>0&&/*#__PURE__*/_jsx("div",{children:renderClusteredComments()})]}),pass!=="unpass"&&level==="L0"&&/*#__PURE__*/_jsx(CommentBox_DraggableIndicator,{})]})})}),provided.placeholder]})});};/* harmony default export */ const components_CommentBox_CommentBox = ((/* unused pure expression or super */ null && (CommentBox_CommentBox)));
;// CONCATENATED MODULE: ./src/components/CommentThread/CommentThread.css
// extracted by mini-css-extract-plugin
/* harmony default export */ const CommentThread_CommentThread = ({});
;// CONCATENATED MODULE: ./src/components/level1/CommentBoxReview.jsx
var CommentBoxReview_templateObject,CommentBoxReview_templateObject2;const CommentBoxReview_CommentBoxContainer=pt.div(CommentBoxReview_templateObject||(CommentBoxReview_templateObject=_taggedTemplateLiteral(["\n  margin-bottom: 10px;\n  padding: 10px;\n  background-color: ",";\n  border-radius: 5px;\n"])),props=>props.hasChildren?'#F2F2F2':'#F2F2F2');const CommentBoxReview_ReplyContainer=pt.div(CommentBoxReview_templateObject2||(CommentBoxReview_templateObject2=_taggedTemplateLiteral(["\n  border-left: 2px solid #ccc;\n  margin-left: 20px;\n  padding-left: 10px;\n"])));const CommentBoxReview_CommentBox=_ref=>{let{articleId,threadId,comment,childrenComments,clusteredComments,isReplyDisabled}=_ref;const[allComments,setAllComments]=useState([]);const hasChildren=clusteredComments&&clusteredComments.length>0;useEffect(()=>{fetchComments();},[]);const fetchComments=async()=>{await new Promise(resolve=>setTimeout(resolve,10000));// 10 second delay
try{const response=await axios.get("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/comments/").concat(threadId));setAllComments(response.data);}catch(error){return;}};const findChildrenComments=commentId=>{return allComments.filter(c=>c.children_id===commentId);};return/*#__PURE__*/_jsxs(CommentBoxReview_CommentBoxContainer,{hasChildren:hasChildren,children:[/*#__PURE__*/_jsx(Comment,{comment:comment,isCombined:true,isDragging:false,isReplyDisabled:true}),childrenComments&&childrenComments.length>0?/*#__PURE__*/_jsxs(_Fragment,{children:[/*#__PURE__*/_jsx(CommentBoxReview_ReplyContainer,{children:childrenComments.map(child=>{const childrenOfChild=findChildrenComments(child.id);return/*#__PURE__*/_jsx(CommentBoxReview_CommentBox,{articleId:articleId,threadId:threadId,comment:child,childrenComments:childrenOfChild,clusteredComments:[],isReplyDisabled:isReplyDisabled},child.id);})}),clusteredComments&&clusteredComments.length>0?/*#__PURE__*/_jsx(_Fragment,{children:clusteredComments.map(child=>{const childrenOfChild=findChildrenComments(child.id);return/*#__PURE__*/_jsx(CommentBoxReview_CommentBox,{articleId:articleId,threadId:threadId,comment:child,childrenComments:childrenOfChild,clusteredComments:[],isReplyDisabled:isReplyDisabled},child.id);})}):null]}):/*#__PURE__*/_jsx(_Fragment,{children:clusteredComments&&clusteredComments.length>0?/*#__PURE__*/_jsx(_Fragment,{children:clusteredComments.map(child=>{const childrenOfChild=findChildrenComments(child.id);return/*#__PURE__*/_jsx(CommentBoxReview_CommentBox,{articleId:articleId,threadId:threadId,comment:child,childrenComments:childrenOfChild,clusteredComments:[],isReplyDisabled:isReplyDisabled},child.id);})}):null})]});};/* harmony default export */ const CommentBoxReview = ((/* unused pure expression or super */ null && (CommentBoxReview_CommentBox)));
;// CONCATENATED MODULE: ./src/components/level1/ReviewPage.css
// extracted by mini-css-extract-plugin
/* harmony default export */ const level1_ReviewPage = ({});
;// CONCATENATED MODULE: ./src/components/level1/AcceptedPopup.jsx
var AcceptedPopup_templateObject,AcceptedPopup_templateObject2,AcceptedPopup_templateObject3,AcceptedPopup_templateObject4;const Overlay=pt.div(AcceptedPopup_templateObject||(AcceptedPopup_templateObject=_taggedTemplateLiteral(["\n  position: fixed;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  background-color: rgba(0, 0, 0, 0.5);\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  z-index: 9999;\n"])));const PopupContainer=pt.div(AcceptedPopup_templateObject2||(AcceptedPopup_templateObject2=_taggedTemplateLiteral(["\n  background-color: #4caf50;\n  padding: 20px;\n  border-radius: 5px;\n  text-align: center;\n"])));const PopupText=pt.p(AcceptedPopup_templateObject3||(AcceptedPopup_templateObject3=_taggedTemplateLiteral(["\n  color: white;\n  font-size: 18px;\n  margin-bottom: 20px;\n"])));const OkayButton=pt.button(AcceptedPopup_templateObject4||(AcceptedPopup_templateObject4=_taggedTemplateLiteral(["\n  background-color: white;\n  color: #4caf50;\n  border: none;\n  padding: 10px 20px;\n  border-radius: 5px;\n  cursor: pointer;\n"])));const AcceptedPopup_AcceptedPopup=_ref=>{let{onClose}=_ref;return/*#__PURE__*/_jsx(Overlay,{children:/*#__PURE__*/_jsxs(PopupContainer,{children:[/*#__PURE__*/_jsx(PopupText,{children:"The review has been accepted and saved."}),/*#__PURE__*/_jsx(PopupText,{children:"Go back and refresh the thread to see the change"}),/*#__PURE__*/_jsx(OkayButton,{onClick:onClose,children:"Okay"})]})});};/* harmony default export */ const level1_AcceptedPopup = ((/* unused pure expression or super */ null && (AcceptedPopup_AcceptedPopup)));
;// CONCATENATED MODULE: ./src/components/level1/DeletedPopup.jsx
var DeletedPopup_templateObject,DeletedPopup_templateObject2,DeletedPopup_templateObject3,DeletedPopup_templateObject4;const DeletedPopup_Overlay=pt.div(DeletedPopup_templateObject||(DeletedPopup_templateObject=_taggedTemplateLiteral(["\n  position: fixed;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  background-color: rgba(0, 0, 0, 0.5);\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  z-index: 9999;\n"])));const DeletedPopup_PopupContainer=pt.div(DeletedPopup_templateObject2||(DeletedPopup_templateObject2=_taggedTemplateLiteral(["\n  background-color: red;\n  padding: 20px;\n  border-radius: 5px;\n  text-align: center;\n"])));const DeletedPopup_PopupText=pt.p(DeletedPopup_templateObject3||(DeletedPopup_templateObject3=_taggedTemplateLiteral(["\n  color: white;\n  font-size: 18px;\n  margin-bottom: 20px;\n"])));const DeletedPopup_OkayButton=pt.button(DeletedPopup_templateObject4||(DeletedPopup_templateObject4=_taggedTemplateLiteral(["\n  background-color: white;\n  color: red;\n  border: none;\n  padding: 10px 20px;\n  border-radius: 5px;\n  cursor: pointer;\n"])));const DeletedPopup_DeletedPopup=_ref=>{let{onClose}=_ref;return/*#__PURE__*/_jsx(DeletedPopup_Overlay,{children:/*#__PURE__*/_jsxs(DeletedPopup_PopupContainer,{children:[/*#__PURE__*/_jsx(DeletedPopup_PopupText,{children:"The cluster suggestion has been deleted"}),/*#__PURE__*/_jsx(DeletedPopup_OkayButton,{onClick:onClose,children:"Okay"})]})});};/* harmony default export */ const level1_DeletedPopup = ((/* unused pure expression or super */ null && (DeletedPopup_DeletedPopup)));
;// CONCATENATED MODULE: ./src/components/level1/ReviewPage.jsx
var ReviewPage_templateObject,ReviewPage_templateObject2,ReviewPage_templateObject3,ReviewPage_templateObject4,ReviewPage_templateObject5,ReviewPage_templateObject6,ReviewPage_templateObject7,ReviewPage_templateObject8,ReviewPage_templateObject9,ReviewPage_templateObject10,ReviewPage_templateObject11,ReviewPage_templateObject12,ReviewPage_templateObject13,ReviewPage_templateObject14;const ReviewPage_ReviewPage=_ref=>{let{articleId,threadId,onBack,header,userId}=_ref;const[reviews,setReviews]=useState([]);const[reviewCount,setReviewCount]=useState(0);const[comments,setComments]=useState([]);const[showAcceptedPopup,setShowAcceptedPopup]=useState(false);const[showDeletedPopup,setShowDeletedPopup]=useState(false);const[floatingMessage,setFloatingMessage]=useState('');const[showFloatingMessage,setShowFloatingMessage]=useState(false);const{updateReview}=React.useContext(SummaryContext);useEffect(()=>{fetchReviews();fetchComments();},[threadId]);useEffect(()=>{const validReviews=reviews.filter(review=>comments.some(comment=>comment.id===review.sourceId)&&comments.some(comment=>comment.id===review.destinationId)&&review.pendingReview===null);setReviewCount(validReviews.length);},[reviews,comments]);const fetchReviews=async()=>{try{const response=await axios.get("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/reviews/").concat(threadId));const filteredReviews=response.data.filter(review=>review.pendingReview===null);setReviews(response.data);}catch(error){console.error('Error fetching reviews:',error);}};const fetchComments=async()=>{try{const response=await axios.get("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/comments/").concat(threadId));setComments(response.data);}catch(error){console.error('Error fetching comments in review page:',error);}};const handleRefresh=()=>{fetchReviews();fetchComments();};const handleAccept=async reviewObj=>{if(!reviewObj.acceptedBy.includes(userId)){try{const updatedReviewObj={...reviewObj,acceptedBy:[...reviewObj.acceptedBy,userId]};await axios.put("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/").concat(threadId,"/reviews/").concat(reviewObj.id),updatedReviewObj);setReviews(prevReviews=>prevReviews.map(review=>review.id===reviewObj.id?updatedReviewObj:review));setFloatingMessage("You have successfully accepted the cluster! Wait for the other users to vote for final decision");setShowFloatingMessage(true);setTimeout(()=>setShowFloatingMessage(false),5000);logEvent("User accepted review for sourceId ".concat(reviewObj.sourceId," into destinationId ").concat(reviewObj.destinationId),userId,'review_accepted');if(updatedReviewObj.acceptedBy.length>=3){// Update the cluster_id of the source comment
try{await axios.put("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/comments/").concat(threadId,"/").concat(reviewObj.sourceId),{cluster_id:reviewObj.destinationId});// Update the hasClusters attribute of the destination comment
await axios.put("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/comments/").concat(threadId,"/").concat(reviewObj.destinationId),{hasClusters:true});// Update the cluster_id of the source comment's children
const childrenComments=comments.filter(c=>c.cluster_id===reviewObj.sourceId);if(childrenComments.length>0){await Promise.all(childrenComments.map(comment=>axios.put("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/comments/").concat(threadId,"/").concat(comment.id),{cluster_id:reviewObj.destinationId})));}fetchReviews();updateReview();setShowAcceptedPopup(true);}catch(error){console.error('Error updating comment:',error);}}}catch(error){console.error('Error updating review:',error);}}};const handleDecline=async reviewObj=>{if(!reviewObj.deniedBy.includes(userId)&&!reviewObj.acceptedBy.includes(userId)){const updatedReviewObj={...reviewObj,deniedBy:[...reviewObj.deniedBy,userId]};try{await axios.put("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/").concat(threadId,"/reviews/").concat(reviewObj.id),updatedReviewObj);setReviews(prevReviews=>prevReviews.map(review=>review.id===reviewObj.id?updatedReviewObj:review));setFloatingMessage("You have rejected the cluster! Wait for the other users to vote for final decision");setShowFloatingMessage(true);setTimeout(()=>setShowFloatingMessage(false),5000);logEvent("User declined review for sourceId ".concat(reviewObj.sourceId," into destinationId ").concat(reviewObj.destinationId),userId,'review_declined');if(updatedReviewObj.deniedBy.length>=3){setReviews(prevReviews=>prevReviews.filter(review=>review.id!==reviewObj.id));fetchReviews();setShowDeletedPopup(true);}}catch(error){console.error('Error updating review:',error);}}};const handleClosePopup=()=>{setShowAcceptedPopup(false);};const handleClosePopupDelete=()=>{setShowDeletedPopup(false);};const handleBack=async()=>{try{await onBack();}catch(error){console.error('Error fetching comments:',error);onBack();}};return/*#__PURE__*/_jsxs(ReviewPageContainer,{children:[/*#__PURE__*/_jsxs(ReviewHeader,{children:[/*#__PURE__*/_jsxs(BackButton,{onClick:handleBack,children:[/*#__PURE__*/_jsx(BackIcon,{children:"\u2190"}),"Back"]}),/*#__PURE__*/_jsxs(RefreshButton,{onClick:handleRefresh,children:[/*#__PURE__*/_jsx(RefreshIcon,{children:"\u21BB"}),"Refresh"]})]}),header,/*#__PURE__*/_jsxs("div",{children:[reviewCount," reviews",/*#__PURE__*/_jsx("span",{style:{fontWeight:"bold",marginLeft:"5px"},children:"(REVIEWING)"})]}),/*#__PURE__*/_jsx(ReviewSection,{children:reviews.filter(review=>review.pendingReview===null).length===0?/*#__PURE__*/_jsx(NoReviewsMessage,{children:"Nothing to review as of right now"}):reviews.filter(review=>comments.some(comment=>comment.id===review.sourceId)&&comments.some(comment=>comment.id===review.destinationId)).filter(review=>review.pendingReview===null).map((review,index)=>/*#__PURE__*/_jsxs("div",{children:[/*#__PURE__*/_jsxs("div",{className:"review-title",children:["#",index+1," Review"]}),/*#__PURE__*/_jsxs(ReviewPage_CommentWrapper,{children:[/*#__PURE__*/_jsx(ReviewPage_CommentContent,{children:comments.filter(c=>c.id===review.sourceId||c.id===review.destinationId).map(comment=>{const childrenComments=comments.filter(c=>c.children_id===comment.id);const clusteredComments=comments.filter(c=>c.cluster_id===comment.id);if(comment.id===review.destinationId&&comment.cluster_id!==null){const clusterComment=comments.find(c=>c.id===comment.cluster_id);const clusterChildrenComments=comments.filter(c=>c.children_id===clusterComment.id);const clusterClusteredComments=comments.filter(c=>c.cluster_id===clusterComment.id);return/*#__PURE__*/_jsx(CommentBoxWrapper,{style:{backgroundColor:'#FEE8E8',padding:'8px'},children:/*#__PURE__*/_jsx(CommentBox,{articleId:articleId,threadId:threadId,comment:clusterComment,childrenComments:clusterChildrenComments,clusteredComments:clusterClusteredComments})},comment.id);}else{return/*#__PURE__*/_jsx(CommentBoxWrapper,{style:{backgroundColor:comment.id===review.sourceId||comment.id===review.destinationId?'#FEE8E8':'inherit',padding:'8px'},children:/*#__PURE__*/_jsx(CommentBox,{articleId:articleId,threadId:threadId,comment:comment,childrenComments:childrenComments,clusteredComments:clusteredComments})},comment.id);}})}),/*#__PURE__*/_jsx(ReviewPage_CommentContent,{children:comments.filter(c=>c.id===review.destinationId)// find the destination comment
.map(comment=>{const destinationId=comment.cluster_id!==null?comment.cluster_id:review.destinationId;// needs to be tested for case [1<-2] and [2<-3]
const modifiedComments=comments.map(c=>{if(c.id===review.sourceId||c.cluster_id===review.sourceId){// find the source comment and its children and exchange to destinationId
return{...c,cluster_id:review.destinationId};}return c;});const childrenComments=modifiedComments.filter(c=>c.children_id===comment.id);const clusteredComments=modifiedComments.filter(c=>c.cluster_id===comment.id);return/*#__PURE__*/_jsxs(CommentBoxWrapper,{style:{backgroundColor:comment.id===review.sourceId||comment.id===review.destinationId?'#DCF8E0':'inherit',padding:'8px'},children:[comment.cluster_id!==null&&/*#__PURE__*/_jsx(PotentialConflictSign,{children:"Potential Conflict!"}),/*#__PURE__*/_jsx(CommentBox,{articleId:articleId,threadId:threadId,comment:comment,childrenComments:childrenComments,clusteredComments:clusteredComments})]},comment.id);})})]}),/*#__PURE__*/_jsx("div",{style:{display:'flex',justifyContent:'flex-end'},children:review.pendingReview===null&&/*#__PURE__*/_jsxs(_Fragment,{children:[/*#__PURE__*/_jsxs(ReviewButton,{style:{backgroundColor:review.acceptedBy.includes(userId)?'green':'#F2F2F2',color:review.acceptedBy.includes(userId)?'white':'black',border:review.acceptedBy.includes(userId)?'none':'1px solid black'},onClick:()=>handleAccept(review),children:["Accept (",review.acceptedBy?review.acceptedBy.length:0,"/3)"]}),/*#__PURE__*/_jsxs(ReviewButton,{style:{backgroundColor:review.deniedBy.includes(userId)?'red':'#F2F2F2',color:review.deniedBy.includes(userId)?'white':'black',border:review.deniedBy.includes(userId)?'none':'1px solid black'},onClick:()=>handleDecline(review),children:["Reject (",review.deniedBy?review.deniedBy.length:0,"/3)"]})]})})]},review.id))}),showAcceptedPopup&&/*#__PURE__*/_jsx(AcceptedPopup,{onClose:handleClosePopup}),showDeletedPopup&&/*#__PURE__*/_jsx(DeletedPopup,{onClose:handleClosePopupDelete}),/*#__PURE__*/_jsx("br",{}),/*#__PURE__*/_jsx("br",{}),/*#__PURE__*/_jsx(ReviewPage_FloatingMessage,{show:showFloatingMessage,children:floatingMessage})]});};/* harmony default export */ const components_level1_ReviewPage = ((/* unused pure expression or super */ null && (ReviewPage_ReviewPage)));const ReviewPageContainer=pt.div(ReviewPage_templateObject||(ReviewPage_templateObject=_taggedTemplateLiteral(["\n  padding: 20px;\n"])));const ReviewHeader=pt.div(ReviewPage_templateObject2||(ReviewPage_templateObject2=_taggedTemplateLiteral(["\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n"])));const BackButton=pt.button(ReviewPage_templateObject3||(ReviewPage_templateObject3=_taggedTemplateLiteral(["\n  background: none;\n  border: none;\n  cursor: pointer;\n  font-size: 15px;\n  display: flex;\n  align-items: center;\n"])));const BackIcon=pt.span(ReviewPage_templateObject4||(ReviewPage_templateObject4=_taggedTemplateLiteral(["\n  margin-right: 5px;\n  font-size: 15px;\n"])));const ReviewSection=pt.div(ReviewPage_templateObject5||(ReviewPage_templateObject5=_taggedTemplateLiteral(["\n  margin-top: 20px;\n"])));const ReviewButton=pt.button(ReviewPage_templateObject6||(ReviewPage_templateObject6=_taggedTemplateLiteral(["\n  background-color: red;\n  color: white;\n  border: none;\n  padding: 10px 20px;\n  margin: 10px 0;\n  border-radius: 5px;\n  cursor: pointer;\n  margin-right: 10px;\n"])));const ReviewPage_CommentWrapper=pt.div(ReviewPage_templateObject7||(ReviewPage_templateObject7=_taggedTemplateLiteral(["\n  display: flex;\n  flex-direction: row;\n  justify-content: space-between;\n  background: #f9f9f9;\n  padding: 10px;\n  margin-bottom: 10px;\n  border: 1px solid #ccc;\n  border-radius: 10px;\n  gap: 10px;\n"])));const ReviewPage_CommentContent=pt.div(ReviewPage_templateObject8||(ReviewPage_templateObject8=_taggedTemplateLiteral(["\n  width: 50%;\n  display: flex;\n  flex-direction: column;\n  gap: 10px; \n"])));const CommentBoxWrapper=pt.div(ReviewPage_templateObject9||(ReviewPage_templateObject9=_taggedTemplateLiteral(["\n  padding: 5px;\n  border-radius: 5px;\n  flex-grow: 1; \n  min-width: 0;\n"])));const NoReviewsMessage=pt.div(ReviewPage_templateObject10||(ReviewPage_templateObject10=_taggedTemplateLiteral(["\n  text-align: center;\n  font-size: 18px;\n  color: #888;\n  margin-top: 50px;\n"])));const PotentialConflictSign=pt.div(ReviewPage_templateObject11||(ReviewPage_templateObject11=_taggedTemplateLiteral(["\n  color: red;\n  font-weight: bold;\n  margin-bottom: 5px;\n"])));const RefreshButton=pt.button(ReviewPage_templateObject12||(ReviewPage_templateObject12=_taggedTemplateLiteral(["\n  background: none;\n  border: none;\n  cursor: pointer;\n  font-size: 15px;\n  display: flex;\n  align-items: center;\n  margin-left: 10px;\n"])));const RefreshIcon=pt.span(ReviewPage_templateObject13||(ReviewPage_templateObject13=_taggedTemplateLiteral(["\n  margin-right: 5px;\n  font-size: 15px;\n"])));const ReviewPage_FloatingMessage=pt.div(ReviewPage_templateObject14||(ReviewPage_templateObject14=_taggedTemplateLiteral(["\n  position: fixed;\n  bottom: 40px;\n  right: 380px;\n  background-color: rgba(0, 0, 0, 0.7);\n  color: white;\n  padding: 10px 20px;\n  border-radius: 5px;\n  z-index: 10000;\n  opacity: ",";\n  transition: opacity 0.3s ease-in-out;\n"])),_ref2=>{let{show}=_ref2;return show?1:0;});
;// CONCATENATED MODULE: ./src/components/level1/SummarizePopup.jsx
var SummarizePopup_templateObject,SummarizePopup_templateObject2,SummarizePopup_templateObject3;const SummarizePopup_PopupContainer=pt.div(SummarizePopup_templateObject||(SummarizePopup_templateObject=_taggedTemplateLiteral(["\n  position: absolute;\n  background-color: white;\n  padding: 20px;\n  width: 400px;\n  border: 1px #ccc;\n  border-radius: 1px;\n  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);\n  z-index: 1000;\n  right: 0;\n  margin-top: 5px;\n"])));const CloseButton=pt.button(SummarizePopup_templateObject2||(SummarizePopup_templateObject2=_taggedTemplateLiteral(["\n  background: none;\n  border: none;\n  font-size: 15px;\n  cursor: pointer;\n"])));const Header=pt.div(SummarizePopup_templateObject3||(SummarizePopup_templateObject3=_taggedTemplateLiteral(["\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  border-bottom: 1px solid #ccc;\n  padding-bottom: 0px;\n  margin-bottom: 5px;\n  height: 30px;\n"])));const SummarizePopup_SummarizePopup=_ref=>{let{articleId,threadId,comment,onClose,buttonRef,summary,reviewId,onSummarySaved}=_ref;const[localSummary,setSummary]=useState("");const[isTextareaEmpty,setIsTextareaEmpty]=useState(true);const{updateSummary}=React.useContext(SummaryContext);const saveSummary=async()=>{try{const summaryToSend=localSummary.trim()!==""?localSummary:summary;await axios.put("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/").concat(threadId,"/reviews/").concat(reviewId),{summary:summaryToSend});onClose();updateSummary();}catch(error){console.error('Error saving summary:',error);}};return/*#__PURE__*/_jsxs(SummarizePopup_PopupContainer,{style:{top:buttonRef.current?buttonRef.current.offsetTop+buttonRef.current.offsetHeight:0,left:'auto',right:buttonRef.current?window.innerWidth-buttonRef.current.offsetLeft-buttonRef.current.offsetWidth:0},children:[/*#__PURE__*/_jsxs(Header,{children:[/*#__PURE__*/_jsx("h4",{children:"Finish the summarization"}),/*#__PURE__*/_jsx(CloseButton,{onClick:onClose,children:"X"})]}),/*#__PURE__*/_jsxs("p",{style:{textAlign:'left'},children:[/*#__PURE__*/_jsx("strong",{children:"AI Suggested Summary:"})," ",summary||"There was a general consensus that this is not the case in the article."]}),/*#__PURE__*/_jsx("textarea",{placeholder:"Revise your own summary",value:localSummary,onChange:e=>{setSummary(e.target.value);setIsTextareaEmpty(e.target.value.trim()==='');},style:{width:"100%",height:"60px"}}),/*#__PURE__*/_jsx("div",{style:{display:'flex',justifyContent:'flex-end'},children:/*#__PURE__*/_jsx("button",{style:{background:isTextareaEmpty?'#B5B5B5':'green',color:'white',cursor:isTextareaEmpty?'not-allowed':'pointer'},onClick:saveSummary,disabled:isTextareaEmpty,children:"Save Summary"})})]});};/* harmony default export */ const level1_SummarizePopup = ((/* unused pure expression or super */ null && (SummarizePopup_SummarizePopup)));
;// CONCATENATED MODULE: ./src/components/level1/SummarizeBox.jsx
const SummarizeBox_SummarizeButton=_ref=>{let{articleId,threadId,comment,clusteredComments,childrenComments,reviewId,onSummarySaved,allComments}=_ref;const[showPopup,setShowPopup]=useState(false);const[summary,setSummary]=useState(null);const buttonRef=useRef(null);const handlePopupClose=()=>{setShowPopup(false);};const findClusteredComments=clusteredCommentId=>{const clusteredComments=allComments.filter(c=>c.children_id===clusteredCommentId);return clusteredComments;};const handleSummarize=async()=>{try{const allComments=[comment.text,...childrenComments.map(comment=>comment.text),...clusteredComments.map(comment=>comment.text),...clusteredComments.flatMap(comment=>findClusteredComments(comment.id).map(child=>child.text))];const commentsString=allComments.join('\n');const response=await axios.post("".concat("https://redesign-online-discourse.vercel.app","/summarize"),{comments:commentsString});const generatedSummary=response.data.summary;setSummary(generatedSummary);setShowPopup(true);}catch(error){console.error('Error generating summary:',error);}};return/*#__PURE__*/_jsxs("div",{style:{justifyContent:"flex-end",alignItems:"flex-end"},children:[/*#__PURE__*/_jsx("button",{ref:buttonRef,style:{background:"green",color:"white"},onClick:handleSummarize,children:"Summarize"}),showPopup&&/*#__PURE__*/_jsx(SummarizePopup,{articleId:articleId,threadId:threadId,comment:comment,onClose:handlePopupClose,buttonRef:buttonRef,summary:summary,reviewId:reviewId,onSummarySaved:onSummarySaved})]});};/* harmony default export */ const SummarizeBox = ((/* unused pure expression or super */ null && (SummarizeBox_SummarizeButton)));
;// CONCATENATED MODULE: ./src/components/CommentBox/CommentUnit.jsx
var CommentUnit_templateObject,CommentUnit_templateObject2,CommentUnit_templateObject3;const CommentUnitContainer=pt.div(CommentUnit_templateObject||(CommentUnit_templateObject=_taggedTemplateLiteral(["\n  margin-bottom: 10px;\n  background-color: ",";\n  border-radius: 5px;\n"])),props=>props.isDragging?'lightgreen':'white');// const CommentUnitContainer = styled.div`
//   margin-bottom: 10px;
//   background-color: ${(props) => (props.isDragging ? 'lightgreen' : 'white')};
//   border-radius: 5px;
//   position: relative; 
//   &:before {
//     content: '';
//     position: absolute;
//     left: 0;
//     top: 0;
//     bottom: 0;
//     width: 5px; 
//     background-color: #5D6BE5; // Blue color
//     border-top-left-radius: 5px;
//     border-bottom-left-radius: 5px;
//     // z-index: 1; 
//   }
// `;
const CommentUnit_ReplyContainer=pt.div(CommentUnit_templateObject2||(CommentUnit_templateObject2=_taggedTemplateLiteral(["\n  border-left: 3px solid #ccc;\n  margin-left: 70px;\n  padding-left: 10px;\n"])));const CommentReplyContainer=pt.div(CommentUnit_templateObject3||(CommentUnit_templateObject3=_taggedTemplateLiteral(["\n  margin-bottom: 10px;\n  border-radius: 5px;\n  background-color: #F2F2F2;\n"])));const CommentUnit_CommentUnit=_ref=>{let{articleId,threadId,comment,index,clusteredComments,childrenComments,userId,onReplyClick,hasSummaryCollapse,refreshTrigger,isReplyingTo}=_ref;const[allComments,setAllComments]=useState([]);const hasChildren=clusteredComments&&clusteredComments.length>0;useEffect(()=>{fetchComments();},[refreshTrigger]);const fetchComments=async()=>{try{const response=await axios.get("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/comments/").concat(threadId));setAllComments(response.data);}catch(error){console.error('Error fetching comment in unit:',error);}};const renderClusteredComments=()=>{return clusteredComments.map((child,childIndex)=>{const childrenComments=allComments.filter(comment=>comment.children_id===child.id);return/*#__PURE__*/_jsx("div",{children:/*#__PURE__*/_jsx(CommentMap,{articleId:articleId,threadId:threadId,comment:child,index:childIndex,clusteredComments:child.clusteredComments||[],childrenComments:childrenComments,userId:userId,isReplyDisabled:false,onReplyClick:onReplyClick,isCombined:true,isReplyingTo:isReplyingTo,allComments:allComments,isReplyEnabled:true},child.id)},child.id);});};return/*#__PURE__*/_jsx(Droppable,{droppableId:"droppable-".concat(comment.id),isDropDisabled:hasSummaryCollapse,children:(provided,snapshot)=>/*#__PURE__*/_jsxs(CommentUnitContainer,{ref:provided.innerRef,...provided.droppableProps,isDragging:snapshot.isDraggingOver,style:{backgroundColor:hasChildren?'#D9DBF4':'white',padding:"3px"}// comment and its background except the comment's cluster background which is separate
,children:[/*#__PURE__*/_jsxs(CommentReplyContainer,{children:[/*#__PURE__*/_jsx(Comment,{articleId:articleId,threadId:threadId,comment:comment,isCombined:true,isDragging:false,isReplyDisabled:false,userId:userId,onReplyClick:onReplyClick,isReplyingTo:isReplyingTo,allComments:allComments}),childrenComments&&childrenComments.length>0&&/*#__PURE__*/_jsx(CommentUnit_ReplyContainer,{children:childrenComments.map((childComment,childIndex)=>/*#__PURE__*/_jsx("div",{children:/*#__PURE__*/_jsx(CommentMap,{articleId:articleId,threadId:threadId,comment:childComment,index:childIndex,clusteredComments:[],childrenComments:[],userId:userId,onReplyClick:onReplyClick,isCombined:true,allComments:allComments})},childComment.id))})]}),clusteredComments&&clusteredComments.length>0&&/*#__PURE__*/_jsx("div",{children:renderClusteredComments()}),provided.placeholder]})});};/* harmony default export */ const CommentBox_CommentUnit = ((/* unused pure expression or super */ null && (CommentUnit_CommentUnit)));
;// CONCATENATED MODULE: ./src/components/level1/SummaryCollapse.jsx
var SummaryCollapse_templateObject,SummaryCollapse_templateObject2,SummaryCollapse_templateObject3,SummaryCollapse_templateObject4;const SummaryCollapse_SummaryCollapse=_ref=>{let{articleId,threadId,summary,comment,clusteredComments,childrenComments,onReplyClick,userId}=_ref;const[isExpanded,setIsExpanded]=useState(true);const toggleExpand=()=>{setIsExpanded(!isExpanded);};return/*#__PURE__*/_jsxs("div",{children:[/*#__PURE__*/_jsxs(SummaryContainer,{children:[/*#__PURE__*/_jsx(SummaryText,{children:summary}),/*#__PURE__*/_jsx(ToggleButton,{onClick:toggleExpand,children:isExpanded?/*#__PURE__*/_jsx(AiFillCaretUp,{}):/*#__PURE__*/_jsx(AiFillCaretDown,{})})]}),isExpanded&&/*#__PURE__*/_jsx(ExpandedContent,{children:/*#__PURE__*/_jsx(CommentBox,{articleId:articleId,threadId:threadId,userId:userId,comment:comment,clusteredComments:clusteredComments,childrenComments:childrenComments,onReplyClick:onReplyClick,pass:"unpass",isSummary:true,isReplyEnabled:false})})]});};/* harmony default export */ const level1_SummaryCollapse = ((/* unused pure expression or super */ null && (SummaryCollapse_SummaryCollapse)));const SummaryContainer=pt.div(SummaryCollapse_templateObject||(SummaryCollapse_templateObject=_taggedTemplateLiteral(["\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 15px;\n  background-color: #e9e9e9;\n  cursor: pointer;\n  border-bottom: 1px solid #ccc;\n  border-radius: 10px 10px 0 0;\n"])));const SummaryText=pt.div(SummaryCollapse_templateObject2||(SummaryCollapse_templateObject2=_taggedTemplateLiteral(["\n  flex: 1;\n  font-size: 16px;\n  font-weight: bold;\n  color: #333;\n"])));const ToggleButton=pt.div(SummaryCollapse_templateObject3||(SummaryCollapse_templateObject3=_taggedTemplateLiteral(["\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 24px;\n  height: 24px;\n  cursor: pointer;\n"])));const ExpandedContent=pt.div(SummaryCollapse_templateObject4||(SummaryCollapse_templateObject4=_taggedTemplateLiteral(["\n  padding: 15px;\n  background-color: #f9f9f9;\n  border: 1px solid #ccc;\n  border-top: none;\n  border-radius: 0 0 10px 10px;\n"])));
;// CONCATENATED MODULE: ./src/components/CommentThread/AcceptedPopup.jsx
var CommentThread_AcceptedPopup_templateObject,CommentThread_AcceptedPopup_templateObject2,CommentThread_AcceptedPopup_templateObject3,CommentThread_AcceptedPopup_templateObject4;const AcceptedPopup_Overlay=pt.div(CommentThread_AcceptedPopup_templateObject||(CommentThread_AcceptedPopup_templateObject=_taggedTemplateLiteral(["\n  position: fixed;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  background-color: rgba(0, 0, 0, 0.5);\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  z-index: 9999;\n"])));const AcceptedPopup_PopupContainer=pt.div(CommentThread_AcceptedPopup_templateObject2||(CommentThread_AcceptedPopup_templateObject2=_taggedTemplateLiteral(["\n  background-color: #4caf50;\n  padding: 20px;\n  border-radius: 5px;\n  text-align: center;\n"])));const AcceptedPopup_PopupText=pt.p(CommentThread_AcceptedPopup_templateObject3||(CommentThread_AcceptedPopup_templateObject3=_taggedTemplateLiteral(["\n  color: white;\n  font-size: 18px;\n  margin-bottom: 20px;\n"])));const AcceptedPopup_OkayButton=pt.button(CommentThread_AcceptedPopup_templateObject4||(CommentThread_AcceptedPopup_templateObject4=_taggedTemplateLiteral(["\n  background-color: white;\n  color: #4caf50;\n  border: none;\n  padding: 10px 20px;\n  border-radius: 5px;\n  cursor: pointer;\n"])));const CommentThread_AcceptedPopup_AcceptedPopup=_ref=>{let{onClose}=_ref;return/*#__PURE__*/_jsx(AcceptedPopup_Overlay,{children:/*#__PURE__*/_jsxs(AcceptedPopup_PopupContainer,{children:[/*#__PURE__*/_jsx(AcceptedPopup_PopupText,{children:"The cluster has been sent for review"}),/*#__PURE__*/_jsx(AcceptedPopup_PopupText,{children:"Wait until L1 accepts the cluster suggestion"}),/*#__PURE__*/_jsx(AcceptedPopup_OkayButton,{onClick:onClose,children:"Okay"})]})});};/* harmony default export */ const CommentThread_AcceptedPopup = ((/* unused pure expression or super */ null && (CommentThread_AcceptedPopup_AcceptedPopup)));
;// CONCATENATED MODULE: ./src/components/CommentThread/CommentThread.jsx
var CommentThread_templateObject,CommentThread_templateObject2,CommentThread_templateObject3,CommentThread_templateObject4,CommentThread_templateObject5,CommentThread_templateObject6,CommentThread_templateObject7,CommentThread_templateObject8,CommentThread_templateObject9,CommentThread_templateObject10,CommentThread_templateObject11,CommentThread_templateObject12,CommentThread_templateObject13,CommentThread_templateObject14,CommentThread_templateObject15,CommentThread_templateObject16,CommentThread_templateObject17,CommentThread_templateObject18,CommentThread_templateObject19,CommentThread_templateObject20,CommentThread_templateObject21,CommentThread_templateObject22,CommentThread_templateObject23,CommentThread_templateObject24,CommentThread_templateObject25,CommentThread_templateObject26;const CommentThread_CommentThread_CommentThread=_ref=>{let{articleId,threadId,topic,onBack,level,userId,question,color}=_ref;const[comments,setComments]=useState([]);const[newComment,setNewComment]=useState('');const[commentCounter,setCommentCounter]=useState(0);const[showReviewPage,setShowReviewPage]=useState(false);const[acceptedReviews,setAcceptedReviews]=useState([]);const[replyingTo,setReplyingTo]=useState(null);const commentInputRef=useRef(null);const[showAcceptedPopup,setShowAcceptedPopup]=useState(false);const[isClusterDeleted,setIsClusterDeleted]=useState(false);const[deletedClusters,setDeletedClusters]=useState([]);const[refreshTrigger,setRefreshTrigger]=useState(0);const[allowComment,setAllowComment]=useState(true);const commentBoxContainerRef=useRef(null);const{summaryUpdated,commentDeleted,reviewUpdated,commentUpvoted,resetAll}=React.useContext(SummaryContext);useEffect(()=>{const fetchData=async()=>{try{if(articleId&&threadId){await Promise.all([fetchComments(),fetchAcceptedReviews()]);if(level==='L0'){initializeLocalStorage();}}else{console.warn('Article ID or Thread ID is missing');}}catch(error){console.error('Error fetching data:',error);}};fetchData();if(replyingTo&&commentInputRef.current){commentInputRef.current.focus();}if(summaryUpdated||commentDeleted||reviewUpdated||commentUpvoted){handleRefresh();resetAll();}},[articleId,threadId,replyingTo,summaryUpdated,commentDeleted,reviewUpdated,commentUpvoted,level]);useEffect(()=>{const handleClickOutside=event=>{if(replyingTo&&commentBoxContainerRef.current&&!commentBoxContainerRef.current.contains(event.target)){setReplyingTo(null);}};document.addEventListener('mousedown',handleClickOutside);return()=>{document.removeEventListener('mousedown',handleClickOutside);};},[replyingTo]);const ClusterPopup=_ref2=>{let{clusters,comments,onClose}=_ref2;return/*#__PURE__*/_jsx(CommentThread_Overlay,{children:/*#__PURE__*/_jsxs(CommentThread_PopupContainer,{children:[/*#__PURE__*/_jsx(Title,{children:"Here are the updates made in your absence:"}),/*#__PURE__*/_jsx(ScrollContainer,{children:clusters.map((cluster,index)=>{const destinationComment=comments.find(comment=>comment.id===cluster.destinationId);const replies=comments.filter(comment=>comment.children_id===cluster.destinationId);const clusteredComments=comments.filter(comment=>comment.cluster_id===cluster.destinationId);return/*#__PURE__*/_jsxs(ClusterSection,{status:cluster.pendingReview,children:[/*#__PURE__*/_jsxs(ClusterLabel,{children:["Cluster #",index+1," Result - ",cluster.pendingReview?'Rejected':'Accepted'," "]}),destinationComment?/*#__PURE__*/_jsx(CommentUnit,{articleId:articleId,threadId:threadId,comment:destinationComment,index:0,clusteredComments:clusteredComments,childrenComments:replies,userId:userId,level:level}):/*#__PURE__*/_jsx("p",{children:"Destination comment not found"})]},cluster.uid);})}),/*#__PURE__*/_jsx(ButtonContainerPopup,{children:/*#__PURE__*/_jsx(CommentThread_OkayButton,{onClick:onClose,children:"Close"})})]})});};const initializeLocalStorage=()=>{const storageKey="clusters_".concat(articleId,"_").concat(threadId);if(!localStorage.getItem(storageKey)){localStorage.setItem(storageKey,JSON.stringify({}));}};const handleRefresh=async()=>{try{await fetchComments();await fetchAcceptedReviews();setRefreshTrigger(prev=>prev+1);}catch(error){console.error('Error refreshing comments:',error);}};const handleClosePopup=()=>{setShowAcceptedPopup(false);};const fetchComments=async()=>{try{if(articleId===undefined||threadId===undefined){throw new Error('Article ID or Thread ID is missing');}const response=await axios.get("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/comments/").concat(threadId));const data=response.data||[];if(level==='L0'){const storageKey="clusters_".concat(articleId,"_").concat(threadId);const clusters=JSON.parse(localStorage.getItem(storageKey));const updatedComments=data.map(comment=>{const cluster=Object.values(clusters).find(c=>c.sourceId===comment.id);if(cluster){return{...comment,cluster_id:cluster.destinationId};}return comment;});setComments(updatedComments);setCommentCounter(countAllComments(updatedComments));}else{const updatedComments=data;setComments(updatedComments);setCommentCounter(countAllComments(updatedComments));}}catch(error){return;}};const fetchAcceptedReviews=async()=>{try{if(!articleId||!threadId){throw new Error('Article ID or Thread ID is missing in review fetch');}const response=await axios.get("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/reviews/").concat(threadId));const acceptedReviews=response.data.filter(review=>!review.pendingReview);setAcceptedReviews(acceptedReviews);if(level==='L0'){const nullReviews=response.data.filter(review=>review.pendingReview!=null);const storageKey="clusters_".concat(articleId,"_").concat(threadId);const clusters=JSON.parse(localStorage.getItem(storageKey))||{};let clustersChanged=false;let deletedClustersArray=[];nullReviews.forEach(review=>{if(review.pendingReview!=null&&clusters){Object.entries(clusters).forEach(_ref3=>{let[uid,cluster]=_ref3;if(cluster&&cluster.children&&cluster.children[0]===review.newOrder[0]){deletedClustersArray.push({...cluster,pendingReview:review.pendingReview});delete clusters[uid];clustersChanged=true;}});}});if(clustersChanged){localStorage.setItem(storageKey,JSON.stringify(clusters));}if(deletedClustersArray.length>0){setDeletedClusters(deletedClustersArray);setIsClusterDeleted(true);}}}catch(error){console.error('Error fetching accepted reviews:',error);}};const countAllComments=comments=>{let count=0;const countChildComments=comment=>{count++;if(comment.children&&comment.children.length>0){comment.children.forEach(countChildComments);}};comments.forEach(countChildComments);return count;};const clientChange=result=>{const{destination,source}=result;if(!destination||source.droppableId===destination.droppableId){return;}const uid=uuidv4();setComments(prevComments=>{const updatedComments=prevComments.map(comment=>{if(comment.id===parseInt(source.droppableId.split('-')[1])){return{...comment,cluster_id:parseInt(destination.droppableId.split('-')[1]),children:[...(comment.children||[]),uid]};}return comment;});return updatedComments;});const storageKey="clusters_".concat(articleId,"_").concat(threadId);const clusters=JSON.parse(localStorage.getItem(storageKey));clusters[uid]={sourceId:parseInt(source.droppableId.split('-')[1]),destinationId:parseInt(destination.droppableId.split('-')[1]),children:[uid]};localStorage.setItem(storageKey,JSON.stringify(clusters));return uid;};const serverChange=async(result,uid)=>{const{destination,source}=result;if(!destination||source.droppableId===destination.droppableId){return;}try{const sourceComment=await axios.get("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/comments/").concat(threadId,"/").concat(source.droppableId.split('-')[1]));const destinationComment=await axios.get("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/comments/").concat(threadId,"/").concat(destination.droppableId.split('-')[1]));const sourceHasClusters=sourceComment.data.hasClusters;const sourceClusterId=sourceComment.data.cluster_id;const destinationHasClusters=destinationComment.data.hasClusters;const destinationClusterId=destinationComment.data.cluster_id;// Case 1: Both source and destination have hasClusters true
if(sourceHasClusters&&destinationHasClusters){console.log("Auto reject 1 case");return;}// Case 2: Destination has a non-null cluster_id
if(destinationClusterId!==null){console.log("Auto rejected 2 case");return;}// Case 3: Destination has hasClusters false and cluster_id null, and source has hasClusters true
if(!destinationHasClusters&&destinationClusterId===null&&sourceHasClusters){console.log("Swapping source and destination");const reviewObj={article_id:articleId,thread_id:threadId,author:userId,timestamp:new Date(),sourceId:parseInt(destination.droppableId.split('-')[1]),destinationId:parseInt(source.droppableId.split('-')[1]),pendingReview:null,newOrder:[uid.toString()],prevOrder:[],acceptedBy:[],deniedBy:[]};setShowAcceptedPopup(true);await axios.post("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/reviews/").concat(threadId),reviewObj);}else{const reviewObj={article_id:articleId,thread_id:threadId,author:userId,timestamp:new Date(),sourceId:parseInt(source.droppableId.split('-')[1]),destinationId:parseInt(destination.droppableId.split('-')[1]),pendingReview:null,newOrder:[uid.toString()],prevOrder:[],acceptedBy:[],deniedBy:[],summary:null};setShowAcceptedPopup(true);await axios.post("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/reviews/").concat(threadId),reviewObj);const sourceId=source.droppableId.split('-')[1];const destinationId=destination.droppableId.split('-')[1];logEvent("User clustered sourceId ".concat(sourceId," into destinationId ").concat(destinationId),userId,'cluster_added');}}catch(error){console.error('Error updating comment order:',error);}};const onDragEnd=async result=>{if(!result.destination)return;const uid=clientChange(result);await serverChange(result,uid);};const handleAddComment=async()=>{if(allowComment&&newComment.trim()){setAllowComment(false);try{const timestamp=new Date();const response=await axios.post("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/").concat(threadId,"/comments"),{thread_id:threadId,text:newComment,author:userId,timestamp:timestamp,upvotes:[],children:[],cluster_id:null,article_id:articleId,children_id:replyingTo?replyingTo:null,hasClusters:false});logEvent("User added new comment with ID ".concat(response.data.id," to thread ").concat(threadId),userId,'comment_added');setComments([...comments,response.data]);setNewComment('');setCommentCounter(commentCounter+1);setReplyingTo(null);fetchComments();setTimeout(()=>{setAllowComment(true);},2000);}catch(error){console.error('Error adding comment:',error);setAllowComment(true);}}};const handleReplyClick=commentId=>{console.log("replying to",commentId||null);setReplyingTo(commentId);};if(showReviewPage&&level==="L1"){return/*#__PURE__*/_jsx(ReviewPage,{articleId:articleId,threadId:threadId,onBack:()=>setShowReviewPage(false),userId:userId,header:/*#__PURE__*/_jsxs(_Fragment,{children:[/*#__PURE__*/_jsx("h2",{children:topic}),/*#__PURE__*/_jsx("div",{className:"heading-underline",style:{backgroundColor:color}}),/*#__PURE__*/_jsx("br",{})]})});}const handleBack=()=>{onBack();};const handleCancelReply=()=>{setReplyingTo(null);};return/*#__PURE__*/_jsxs("div",{className:"comment-thread-container",children:[/*#__PURE__*/_jsxs(ButtonContainer,{children:[/*#__PURE__*/_jsxs(CommentThread_BackButton,{onClick:handleBack,children:[/*#__PURE__*/_jsx(CommentThread_BackIcon,{children:"\u2190"}),"Back"]}),/*#__PURE__*/_jsxs(CommentThread_RefreshButton,{onClick:handleRefresh,children:[/*#__PURE__*/_jsx(CommentThread_RefreshIcon,{children:"\u21BB"}),"Refresh"]})]}),/*#__PURE__*/_jsx(ThreadHeader,{className:"thread-header",children:/*#__PURE__*/_jsx("h2",{children:topic})}),/*#__PURE__*/_jsx("div",{className:"heading-underline",style:{backgroundColor:color}}),/*#__PURE__*/_jsx("div",{className:"random-question",children:question}),/*#__PURE__*/_jsxs("div",{style:{display:'flex',justifyContent:'space-between',alignItems:'center'},children:[comments&&comments.length>0&&/*#__PURE__*/_jsxs("div",{className:"comment-count",children:[commentCounter," comments"]}),level==="L1"&&/*#__PURE__*/_jsx("div",{style:{display:'flex',justifyContent:'flex-end',flex:1},children:/*#__PURE__*/_jsx(CommentThread_ReviewButton,{onClick:()=>setShowReviewPage(true),children:"Review clustered comments >>"})})]}),comments&&comments.length===0?/*#__PURE__*/_jsx("div",{className:"no-comments",children:/*#__PURE__*/_jsx("p",{children:"No Comments"})}):/*#__PURE__*/_jsx(DragDropContext,{onDragEnd:onDragEnd,children:/*#__PURE__*/_jsx(CommentsContainer,{children:comments.filter(comment=>comment.children_id===null&&comment.cluster_id===null).map((comment,index)=>{// Find the replies to the parent comment
const replies=comments.filter(c=>c.children_id===comment.id);// Find the clusters to the parent comment
const clusteredComments=comments.filter(c=>c.cluster_id===comment.id);// Check if the cluster is accepted
const isClusterAccepted=acceptedReviews.some(review=>review.destinationId===comment.id);// Find the accepted review that matches the comment's sourceId
const acceptedReview=acceptedReviews.find(review=>review.destinationId===comment.id);return/*#__PURE__*/_jsx(React.Fragment,{children:clusteredComments.length>0?/*#__PURE__*/_jsxs(React.Fragment,{children:[acceptedReview&&acceptedReview.summary?/*#__PURE__*/_jsx(_Fragment,{children:/*#__PURE__*/_jsx(SummaryCollapse,{articleId:articleId,threadId:threadId,userId:userId,summary:acceptedReview.summary,comment:comment,childrenComments:replies,clusteredComments:clusteredComments,onReplyClick:handleReplyClick})}):/*#__PURE__*/_jsxs(CombinedCommentContainer,{children:[/*#__PURE__*/_jsx(CommentUnit,{articleId:articleId,threadId:threadId,comment:comment,index:index,clusteredComments:clusteredComments,childrenComments:replies,userId:userId,onReplyClick:handleReplyClick,level:level,hasSummaryCollapse:comment.summary!==undefined&&comment.summary!==null,refreshTrigger:refreshTrigger,isReplyingTo:replyingTo===comment.id}),level==='L1'&&isClusterAccepted&&!(acceptedReview!==null&&acceptedReview!==void 0&&acceptedReview.summary)&&/*#__PURE__*/_jsx("div",{style:{display:'flex',justifyContent:'flex-end'},children:/*#__PURE__*/_jsx(SummarizeButton,{articleId:articleId,threadId:threadId,comment:comment,clusteredComments:clusteredComments,childrenComments:replies,reviewId:acceptedReview.id,onSummarySaved:fetchComments(),allComments:comments})})]}),/*#__PURE__*/_jsx(ReviewMessageContainer,{children:level==='L0'||level==='L2'?(()=>{const storageKey="clusters_".concat(articleId,"_").concat(threadId);const clusters=JSON.parse(localStorage.getItem(storageKey)||'{}');const isLocalCluster=Object.values(clusters).some(cluster=>cluster.destinationId===comment.id);return isLocalCluster?/*#__PURE__*/_jsx(ReviewMessage,{children:"This cluster is currently visible only to you."}):acceptedReview!==null&&acceptedReview!==void 0&&acceptedReview.summary&&isClusterAccepted?null:/*#__PURE__*/_jsx(ReviewMessage,{children:"Cluster accepted. Summary pending."});})():null})]}):/*#__PURE__*/_jsx(CommentBox,{articleId:articleId,threadId:threadId,comment:comment,index:index,childrenComments:replies,clusteredComments:[],userId:userId,onReplyClick:handleReplyClick,level:level,isReplyingTo:replyingTo===comment.id})},comment.id);})})}),/*#__PURE__*/_jsx(Separator,{}),/*#__PURE__*/_jsxs(CommentThread_CommentBoxContainer,{ref:commentBoxContainerRef,children:[/*#__PURE__*/_jsx(UserProfile,{children:userId.charAt(0).toUpperCase()||'A'}),/*#__PURE__*/_jsxs(CommentInputContainer,{children:[/*#__PURE__*/_jsx(CommentInput,{ref:commentInputRef,placeholder:replyingTo?"Write a reply...":"Add a comment...",value:newComment,onChange:e=>setNewComment(e.target.value),onKeyDown:e=>{if(e.key==='Enter'){e.preventDefault();handleAddComment();}}}),/*#__PURE__*/_jsxs(CommentThread_CommentActions,{children:[/*#__PURE__*/_jsx(AddCommentButton,{onClick:handleAddComment,disabled:!allowComment,children:allowComment?'POST':'Please wait...'}),/*#__PURE__*/_jsx("br",{}),/*#__PURE__*/_jsx("br",{})]})]})]}),isClusterDeleted&&deletedClusters.length>0&&/*#__PURE__*/_jsx(ClusterPopup,{clusters:deletedClusters,comments:comments,onClose:()=>setIsClusterDeleted(false)}),showAcceptedPopup&&/*#__PURE__*/_jsx(AcceptedPopup,{onClose:handleClosePopup})]});};/* harmony default export */ const components_CommentThread_CommentThread = ((/* unused pure expression or super */ null && (CommentThread_CommentThread_CommentThread)));const ScrollContainer=pt.div(CommentThread_templateObject||(CommentThread_templateObject=_taggedTemplateLiteral(["\n  max-height: 400px;\n  overflow-y: auto;\n"])));const ClusterLabel=pt.h4(CommentThread_templateObject2||(CommentThread_templateObject2=_taggedTemplateLiteral(["\n  margin: 0;\n  padding: 0 0 10px 0;\n  color: black;\n  margin-top: 5px;\n"])));const CommentThread_CommentBoxContainer=pt.div(CommentThread_templateObject3||(CommentThread_templateObject3=_taggedTemplateLiteral(["\n  display: flex;\n  align-items: flex-start;\n  margin-top: 20px;\n  width: 100%;\n"])));const CommentInputContainer=pt.div(CommentThread_templateObject4||(CommentThread_templateObject4=_taggedTemplateLiteral(["\n  display: flex;\n  flex-direction: column;\n  margin-left: 10px;\n  width: 100%;\n"])));const CommentInput=pt.textarea(CommentThread_templateObject5||(CommentThread_templateObject5=_taggedTemplateLiteral(["\n  width: 100%;\n  height: 60px;\n  margin-bottom: 10px;\n  padding: 10px;\n  border: 1px solid #ccc;\n  border-radius: 5px;\n  box-sizing: border-box;\n"])));const CommentThread_CommentActions=pt.div(CommentThread_templateObject6||(CommentThread_templateObject6=_taggedTemplateLiteral(["\n  display: flex;\n  flex-direction: column;\n  align-items: flex-start;\n  width: 100%;\n"])));const UserProfile=pt.div(CommentThread_templateObject7||(CommentThread_templateObject7=_taggedTemplateLiteral(["\n  width: 30px;\n  height: 30px;\n  border-radius: 50%;\n  background-color: #ccc;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 24px;\n  color: black;\n  font-weight: bold;\n  margin-top: 10px;\n  flex-shrink: 0;\n"])));const AddCommentButton=pt.button(CommentThread_templateObject8||(CommentThread_templateObject8=_taggedTemplateLiteral(["\n  width: 100%;\n  padding: 10px 20px;\n  // background-color: #007bff;\n  color: white;\n  border: none;\n  border-radius: 5px;\n  cursor: pointer;\n  box-sizing: border-box;\n  background-color: #5D6BE5\n"])));const Separator=pt.hr(CommentThread_templateObject9||(CommentThread_templateObject9=_taggedTemplateLiteral(["\n  width: 100%;\n  border: 0;\n  height: 1px;\n  background: #ccc;\n  margin: 20px 0;\n"])));const ThreadHeader=pt.div(CommentThread_templateObject10||(CommentThread_templateObject10=_taggedTemplateLiteral(["\n  display: flex;\n  align-items: center;\n  justify-content: flex-start;\n"])));const CommentThread_BackButton=pt.button(CommentThread_templateObject11||(CommentThread_templateObject11=_taggedTemplateLiteral(["\n  background: none;\n  border: none;\n  cursor: pointer;\n  font-size: 15px;\n  display: flex;\n  align-items: center;\n"])));const CommentThread_BackIcon=pt.span(CommentThread_templateObject12||(CommentThread_templateObject12=_taggedTemplateLiteral(["\n  margin-right: 5px;\n  font-size: 15px;\n"])));const CombinedCommentContainer=pt.div(CommentThread_templateObject13||(CommentThread_templateObject13=_taggedTemplateLiteral(["\n  padding: 5px;\n  margin: 10px 0;\n  background-color: #D9DBF4;\n  border: 1px solid lightgray;\n  border-radius: 5px;\n"])));const ReviewMessageContainer=pt.div(CommentThread_templateObject14||(CommentThread_templateObject14=_taggedTemplateLiteral(["\n  margin-top: 10px;\n  margin-right: 5px;\n  text-align: right;\n"])));const ReviewMessage=pt.div(CommentThread_templateObject15||(CommentThread_templateObject15=_taggedTemplateLiteral(["\n  font-size: 12px;\n  font-weight: bold;\n  color: #97a0ec;\n  margin-bottom: 5px;\n"])));const CommentsContainer=pt.div(CommentThread_templateObject16||(CommentThread_templateObject16=_taggedTemplateLiteral(["\n  margin-top: 10px;\n  padding: 10px;\n  background-color: white; \n"])));const CommentThread_ReviewButton=pt.button(CommentThread_templateObject17||(CommentThread_templateObject17=_taggedTemplateLiteral(["\n  background-color: #5D6BE5;\n  color: white;\n  border: none;\n  padding: 4px 5px;\n  margin: 5px 0;\n  border-radius: 5px;\n  cursor: pointer;\n  font-weight: bold;\n"])));const CommentThread_RefreshButton=pt.button(CommentThread_templateObject18||(CommentThread_templateObject18=_taggedTemplateLiteral(["\n  background: none;\n  border: none;\n  cursor: pointer;\n  font-size: 15px;\n  display: flex;\n  align-items: center;\n  margin-left: 10px;\n"])));const CommentThread_RefreshIcon=pt.span(CommentThread_templateObject19||(CommentThread_templateObject19=_taggedTemplateLiteral(["\n  margin-right: 5px;\n  font-size: 15px;\n"])));const ButtonContainer=pt.div(CommentThread_templateObject20||(CommentThread_templateObject20=_taggedTemplateLiteral(["\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  width: 100%;\n"])));const CommentThread_Overlay=pt.div(CommentThread_templateObject21||(CommentThread_templateObject21=_taggedTemplateLiteral(["\n  position: fixed;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  background-color: rgba(0, 0, 0, 0.5);\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  z-index: 9999;\n"])));const CommentThread_PopupContainer=pt.div(CommentThread_templateObject22||(CommentThread_templateObject22=_taggedTemplateLiteral(["\n  background-color: #ffffff;\n  padding: 20px;\n  border-radius: 10px;\n  width: 80%;\n  max-width: 700px;\n  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);\n"])));const Title=pt.h3(CommentThread_templateObject23||(CommentThread_templateObject23=_taggedTemplateLiteral(["\n  font-size: 24px;\n  font-weight: bold;\n  margin-bottom: 20px;\n"])));const ClusterSection=pt.div(CommentThread_templateObject24||(CommentThread_templateObject24=_taggedTemplateLiteral(["\n  background-color: ",";\n  margin: 10px 0;\n  padding: 15px;\n  border-radius: 10px;\n  border: 1px solid ",";\n"])),props=>props.status?'#ffdddd':'#ddffdd',props=>props.status?'#ffaaaa':'#aaffaa');const CommentThread_OkayButton=pt.button(CommentThread_templateObject25||(CommentThread_templateObject25=_taggedTemplateLiteral(["\n  background-color: #5D6BE5;\n  color: white;\n  border: none;\n  padding: 10px 20px;\n  border-radius: 5px;\n  cursor: pointer;\n  font-size: 16px;\n  transition: background-color 0.3s ease;\n\n  &:hover {\n    background-color: #3b4bb3;\n  }\n"])));const ButtonContainerPopup=pt.div(CommentThread_templateObject26||(CommentThread_templateObject26=_taggedTemplateLiteral(["\n  display: flex;\n  justify-content: center;\n  width: 100%;\n  margin-top: 20px;\n"])));
;// CONCATENATED MODULE: ./src/components/CommentSection/CommentSection.css
// extracted by mini-css-extract-plugin
/* harmony default export */ const CommentSection = ({});
;// CONCATENATED MODULE: ./src/components/CommentSection/CommentSection.jsx
var CommentSection_templateObject,CommentSection_templateObject2,CommentSection_templateObject3,CommentSection_templateObject4;const HeaderContainer=pt.div(CommentSection_templateObject||(CommentSection_templateObject=_taggedTemplateLiteral(["\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  width: 100%;\n  margin-bottom: 10px;\n"])));const CommentSection_RefreshButton=pt.button(CommentSection_templateObject2||(CommentSection_templateObject2=_taggedTemplateLiteral(["\n  background: none;\n  border: none;\n  cursor: pointer;\n  font-size: 15px;\n  display: flex;\n  align-items: center;\n  font-weight: bold;\n"])));const CommentSection_RefreshIcon=pt.span(CommentSection_templateObject3||(CommentSection_templateObject3=_taggedTemplateLiteral(["\n  margin-right: 5px;\n  font-size: 15px;\n"])));const CommentSection_FloatingMessage=pt.div(CommentSection_templateObject4||(CommentSection_templateObject4=_taggedTemplateLiteral(["\n  position: fixed;\n  bottom: 40px;\n  right: 380px;\n  background-color: rgba(0, 0, 0, 0.7);\n  color: white;\n  padding: 10px 20px;\n  border-radius: 5px;\n  z-index: 10000;\n  opacity: ",";\n  transition: opacity 0.3s ease-in-out;\n"])),_ref=>{let{show}=_ref;return show?1:0;});function CommentSection_CommentSection(_ref2){let{userId,level}=_ref2;const[topics,setTopics]=useState([]);const[articleId,setArticleId]=useState(null);const colors=["#5D6BE5","#84D2C4","#FC9CF2","#2596be","red","green","yellow"];const[selectedThread,setSelectedThread]=useState(null);const[questions,setQuestions]=useState([]);// for new discussion thread
const[isPopupOpen,setIsPopupOpen]=useState(false);const[isReviewPopupOpen,setIsReviewPopupOpen]=useState(false);const[summaries,setSummaries]=useState([]);const[timestamps,setTimestamps]=useState([]);// everything is used for suggest topic button
const[suggestedMaterials,setSuggestedMaterials]=useState([]);const[newTopic,setNewTopic]=useState('');const[newQuestion,setNewQuestion]=useState('');const[isCheckboxChecked,setIsCheckboxChecked]=useState(false);const isButtonEnabled=(isCheckboxChecked||newTopic.trim()!==''&&newQuestion.trim()!=='')&&level==="L2";const[allPendingTopics,setAllPendingTopics]=useState([]);const[pendingTopics,setPendingTopics]=useState([]);const[topicActions,setTopicActions]=useState({});const[confirmationMessage,setConfirmationMessage]=useState('');const[showConfirmationMessage,setShowConfirmationMessage]=useState(false);const[floatingMessage,setFloatingMessage]=useState('');const[showFloatingMessage,setShowFloatingMessage]=useState(false);const[commentCounts,setCommentCounts]=useState({});const[currentUserPendingTopics,setCurrentUserPendingTopics]=useState([]);const fetchTopics=async()=>{try{const currentUrl=window.location.href;const encodedUrl=encodeURIComponent(currentUrl);const response=await axios.get("".concat("https://redesign-online-discourse.vercel.app","/api/website_check/").concat(encodedUrl));setTopics(response.data.topics||[]);setQuestions(response.data.questions||[]);setSuggestedMaterials(response.data.suggested_topic_question||[]);setArticleId(response.data.article_id);}catch(error){console.error('Error fetching topics and questions:',error);}};useEffect(()=>{fetchTopics();},[]);const fetchAllAcceptedReviews=async()=>{const summariesTemp=[];const timestampsTemp=[];const commentCountsTemp={};for(let threadId=1;threadId<=6;threadId++){try{const response=await axios.get("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/reviews/").concat(threadId));const reviews=response.data.filter(review=>!review.pendingReview).map(review=>({summary:review.summary,timestamp:moment.utc(review.timestamp).format('MMMM D, HH:mm')}));summariesTemp[threadId]=reviews.filter(review=>review.summary!=null).map(review=>review.summary);timestampsTemp[threadId]=reviews.map(review=>review.timestamp);const commentCount=await fetchCommentCount(threadId);commentCountsTemp[threadId]=commentCount;}catch(error){console.error("Error fetching accepted reviews for threadId ".concat(threadId,":"),error);summariesTemp[threadId]=[];timestampsTemp[threadId]=[];commentCountsTemp[threadId]=0;}}setSummaries(summariesTemp);setTimestamps(timestampsTemp);setCommentCounts(commentCountsTemp);};useEffect(()=>{if(articleId){fetchAllAcceptedReviews();}},[articleId]);const handleThreadClick=topic=>{setSelectedThread({id:topic.id,topic:topic.text,question:questions[topic.id-1]||"Question Placeholder",color:topic.color||"#FFFFFF"});};const handleRefresh=async()=>{try{await fetchAllAcceptedReviews();await fetchTopics();}catch(error){console.error('Error refreshing comments:',error);}};const addNewThread=async()=>{if(isButtonEnabled){let newTopicText='';let newQuestionText='';if(isCheckboxChecked){newTopicText=suggestedMaterials[0];newQuestionText=suggestedMaterials[1];}else{newTopicText=newTopic;newQuestionText=newQuestion;}const allPendingTopics=await fetchAllPendingTopics();const topicExists=allPendingTopics.some(topic=>{return topic.suggested_topic.toLowerCase()===newTopicText.toLowerCase();});if(topicExists){setFloatingMessage('Duplicate topic names are not possible. Please check topics in Review Threads section.');setShowFloatingMessage(true);setTimeout(()=>setFloatingMessage(false),5000);// Clear message after 5 seconds
return;}try{logEvent("User suggested new thread: ".concat(newTopicText),userId,'thread_suggested');await axios.post("".concat("https://redesign-online-discourse.vercel.app","/api/topics/").concat(articleId),{author:userId,suggested_topic:newTopicText,suggested_question:newQuestionText});setConfirmationMessage('Thank you! Your suggestion has been submitted successfully. Your suggestion will only be displayed to other people.');}catch(error){console.error('Error creating new discussion thread:',error);setConfirmationMessage('An error occurred while submitting your suggestion. Please try again.');}setIsPopupOpen(false);setShowConfirmationMessage(true);setTimeout(()=>setShowConfirmationMessage(false),7000);}};const fetchPendingTopics=async()=>{try{const response=await axios.get("".concat("https://redesign-online-discourse.vercel.app","/api/topics/").concat(articleId,"?current_user_id=").concat(userId));if(response.data&&Array.isArray(response.data)){const filteredTopics=response.data.filter(topic=>topic.final_status==="pending");setPendingTopics(filteredTopics);setTopicActions(prevActions=>{const newActions={...prevActions};filteredTopics.forEach(topic=>{if(topic.acceptedBy&&topic.acceptedBy.includes(userId)){newActions[topic.id]='accept';}else if(topic.deniedBy&&topic.deniedBy.includes(userId)){newActions[topic.id]='reject';}else{newActions[topic.id]=null;}});return newActions;});}}catch(error){console.error('Error fetching pending topics:',error);}};const fetchAllPendingTopics=async()=>{try{const response=await axios.get("".concat("https://redesign-online-discourse.vercel.app","/api/topicsAll/").concat(articleId));if(response.data&&Array.isArray(response.data)){const filteredTopics=response.data.filter(topic=>topic.final_status==="pending");setAllPendingTopics(filteredTopics);const currentUserTopics=filteredTopics.filter(topic=>topic.author===userId);setCurrentUserPendingTopics(currentUserTopics);return filteredTopics;}return[];}catch(error){console.error('Error fetching pending topics:',error);return[];}};useEffect(()=>{if(isReviewPopupOpen){fetchPendingTopics();fetchAllPendingTopics();}},[isReviewPopupOpen]);const handleTopicAction=(topicId,action)=>{setTopicActions(prev=>({...prev,[topicId]:action}));};const handleSaveTopicReviews=async()=>{try{const updatePromises=Object.entries(topicActions).map(_ref3=>{let[topicId,action]=_ref3;if(action){return axios.put("".concat("https://redesign-online-discourse.vercel.app","/api/topics/").concat(articleId,"/").concat(topicId),{acceptedBy:action==='accept'?[userId]:[],deniedBy:action==='reject'?[userId]:[]});}return Promise.resolve();});await Promise.all(updatePromises);setIsReviewPopupOpen(false);fetchPendingTopics();setTopicActions({});setConfirmationMessage('Thank you! Your choices have been saved successfully.');setShowConfirmationMessage(true);setTimeout(()=>setShowConfirmationMessage(false),7000);}catch(error){console.error('Error saving topic reviews:',error);}};const handleClosePopup=()=>{setIsPopupOpen(false);setNewTopic('');setNewQuestion('');setIsCheckboxChecked(false);};const fetchCommentCount=async threadId=>{try{const response=await axios.get("".concat("https://redesign-online-discourse.vercel.app","/api/articles/").concat(articleId,"/comments/").concat(threadId));const data=response.data||[];return data.length;}catch(error){console.error("Error fetching comment count for threadId ".concat(threadId,":"),error);return 0;}};const topicWidth="".concat(100/topics.length,"%");return/*#__PURE__*/_jsxs("div",{className:"comment-section",style:{display:'flex',flexDirection:'column',alignItems:'center'},children:[!selectedThread?/*#__PURE__*/_jsxs("div",{className:"discussion-threads",style:{width:'100%'},children:[/*#__PURE__*/_jsxs(HeaderContainer,{children:[/*#__PURE__*/_jsx("div",{className:"header-title",children:/*#__PURE__*/_jsx("b",{children:"Discussions About the Article"})}),/*#__PURE__*/_jsxs(CommentSection_RefreshButton,{onClick:handleRefresh,children:[/*#__PURE__*/_jsx(CommentSection_RefreshIcon,{children:"\u21BB"}),"Refresh"]})]}),/*#__PURE__*/_jsx("div",{className:"thread-list",No:true,Summaries:true,style:{display:'flex'},children:topics.map((topic,idx)=>/*#__PURE__*/_jsxs("div",{style:{display:"flex",flexDirection:"column",width:topicWidth,margin:"5px"},children:[/*#__PURE__*/_jsx("div",{className:"topic-heading",style:{display:"flex",borderBottom:"3px solid ".concat(colors[idx%colors.length]),height:"50px",alignItems:"center",marginBottom:"15px"},children:topic}),/*#__PURE__*/_jsx("div",{className:"thread-box ".concat(!summaries[idx+1]||summaries[idx+1].length===0?'no-comments':''),onClick:()=>handleThreadClick({id:idx+1,text:topic,color:colors[idx%colors.length]}),style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",width:'100%',height:'400px',backgroundColor:"#E9E9E9"},children:summaries[idx+1]&&summaries[idx+1].length>0?/*#__PURE__*/_jsx("div",{className:"timeline",children:summaries[idx+1].map((summary,index)=>summary?/*#__PURE__*/_jsxs("div",{className:"timeline-item",style:{position:'relative',paddingLeft:'20px',marginBottom:'10px'},children:[/*#__PURE__*/_jsx("div",{className:"timeline-date",style:{padding:'5px 10px',background:colors[idx%colors.length],color:'white',borderRadius:'5px',marginBottom:'5px'},children:timestamps[idx+1][index]}),/*#__PURE__*/_jsx("div",{className:"timeline-content",children:summary}),/*#__PURE__*/_jsx("div",{style:{position:'absolute',left:'-12px',top:'0',width:'6px',height:'100%',backgroundColor:colors[idx%colors.length]}})]},index):null)}):/*#__PURE__*/_jsxs(_Fragment,{children:[/*#__PURE__*/_jsx("b",{className:"no-comments",children:"No Summaries"}),/*#__PURE__*/_jsx("br",{}),/*#__PURE__*/_jsxs("span",{className:"click-here",children:["View all ",commentCounts[idx+1]||0," comments"]})]})})]},idx))}),/*#__PURE__*/_jsxs("div",{style:{display:'flex',justifyContent:'center',width:'100%'},children:[/*#__PURE__*/_jsx("button",{style:{padding:"10px 20px",marginTop:"20px",backgroundColor:level==="L2"?"#5D6BE5":"#E9E9E9",color:"white",border:"none",borderRadius:"5px",cursor:"pointer"},onClick:()=>{if(level==="L2"){setIsPopupOpen(true);setNewTopic('');setNewQuestion('');setIsCheckboxChecked(false);}},children:"Suggest New Thread"}),/*#__PURE__*/_jsx("button",{style:{padding:"10px 20px",marginTop:"20px",marginLeft:"10px",backgroundColor:level==="L2"?"#5D6BE5":"#E9E9E9",color:"white",border:"none",borderRadius:"5px",cursor:"pointer"},onClick:()=>{if(level==="L2"){setIsReviewPopupOpen(true);}},children:"Review Threads"})]}),/*#__PURE__*/_jsx("br",{}),/*#__PURE__*/_jsx("br",{}),showConfirmationMessage&&/*#__PURE__*/_jsx(CommentSection_FloatingMessage,{show:showConfirmationMessage,children:confirmationMessage}),floatingMessage&&/*#__PURE__*/_jsx(CommentSection_FloatingMessage,{show:showFloatingMessage,children:floatingMessage})]}):/*#__PURE__*/_jsx(SummaryProvider,{children:/*#__PURE__*/_jsx(CommentThread,{articleId:articleId,question:selectedThread.question,threadId:selectedThread.id,topic:selectedThread.topic,onBack:()=>setSelectedThread(null),level:level,userId:userId,color:selectedThread.color})}),isPopupOpen&&/*#__PURE__*/_jsx("div",{className:"popup-overlay",style:{position:'fixed',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0, 0, 0, 0.5)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:9999},children:/*#__PURE__*/_jsxs("div",{className:"popup-content",style:{background:'white',padding:'20px',borderRadius:'10px',width:'500px',zIndex:10000,boxShadow:'0 4px 8px rgba(0, 0, 0, 0.1)'},children:[/*#__PURE__*/_jsxs("div",{style:{display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'2px solid black',paddingBottom:'10px'},children:[/*#__PURE__*/_jsx("span",{children:"Suggest New Discussion Thread"}),/*#__PURE__*/_jsx("button",{onClick:handleClosePopup,style:{background:'none',border:'none',fontSize:'16px',cursor:'pointer'},children:"X"})]}),/*#__PURE__*/_jsx("div",{style:{margin:'20px 0'},children:suggestedMaterials.length===2&&/*#__PURE__*/_jsxs("div",{style:{marginTop:'10px'},children:[/*#__PURE__*/_jsx("input",{type:"checkbox",id:"suggested-topic",name:"suggested-topic",checked:isCheckboxChecked,onChange:e=>setIsCheckboxChecked(e.target.checked),disabled:newTopic.trim()!==''||newQuestion.trim()!==''}),/*#__PURE__*/_jsxs("label",{htmlFor:"suggested-topic",style:{marginLeft:'10px'},children:[/*#__PURE__*/_jsx("b",{children:"AI Topic:"})," ",suggestedMaterials[0],/*#__PURE__*/_jsx("br",{}),/*#__PURE__*/_jsx("i",{children:" Question: "})," ",suggestedMaterials[1]]})]})}),/*#__PURE__*/_jsxs("div",{style:{marginBottom:'20px'},children:[/*#__PURE__*/_jsx("p",{children:"Write down new topic"}),/*#__PURE__*/_jsx("textarea",{value:newTopic,onChange:e=>setNewTopic(e.target.value),placeholder:"Topic",style:{width:'100%',padding:'10px',borderRadius:'5px',border:'1px solid #ccc',marginBottom:'10px'},disabled:isCheckboxChecked}),/*#__PURE__*/_jsx("p",{children:"Add supporting question to the topic"}),/*#__PURE__*/_jsx("textarea",{value:newQuestion,onChange:e=>setNewQuestion(e.target.value),placeholder:"Question",style:{width:'100%',padding:'10px',borderRadius:'5px',border:'1px solid #ccc'},disabled:isCheckboxChecked})]}),/*#__PURE__*/_jsx("div",{style:{display:'flex',justifyContent:'center',alignItems:'center'},children:/*#__PURE__*/_jsx("button",{onClick:addNewThread,style:{padding:'10px 20px',backgroundColor:isButtonEnabled?'#5D6BE5':'gray',color:'white',border:'none',borderRadius:'5px',cursor:isButtonEnabled?'pointer':'not-allowed',alignItems:'center',justifyContent:'center'},disabled:!isButtonEnabled,children:"Suggest change"})})]})}),isReviewPopupOpen&&/*#__PURE__*/_jsx("div",{className:"popup-overlay",style:{position:'fixed',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0, 0, 0, 0.5)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:9999},children:/*#__PURE__*/_jsxs("div",{className:"popup-content",style:{background:'white',padding:'20px',borderRadius:'10px',width:'500px',zIndex:10000},children:[/*#__PURE__*/_jsxs("div",{style:{display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'2px solid black',paddingBottom:'10px'},children:[/*#__PURE__*/_jsx("span",{children:"Review Suggested Threads"}),/*#__PURE__*/_jsx("button",{onClick:()=>setIsReviewPopupOpen(false),style:{background:'none',border:'none',fontSize:'16px',cursor:'pointer'},children:"X"})]}),/*#__PURE__*/_jsxs("div",{style:{margin:'20px 0',textAlign:'center'},children:[/*#__PURE__*/_jsxs("div",{style:{marginBottom:'20px'},children:[/*#__PURE__*/_jsx("h3",{children:"Your Pending Topics"}),currentUserPendingTopics&&currentUserPendingTopics.length>0?currentUserPendingTopics.map(topic=>/*#__PURE__*/_jsxs("div",{style:{marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between'},children:[/*#__PURE__*/_jsx("div",{style:{flexGrow:1,textAlign:'left',marginRight:'10px'},children:/*#__PURE__*/_jsx("strong",{children:topic.suggested_topic})}),/*#__PURE__*/_jsxs("div",{style:{display:'flex',alignItems:'center'},children:[/*#__PURE__*/_jsx("span",{style:{marginRight:'10px'},children:"Waiting for approval"}),/*#__PURE__*/_jsx(AiOutlineClockCircle,{style:{color:'black',fontSize:'30px'}})]})]},topic.id)):/*#__PURE__*/_jsx("div",{children:"No pending topics submitted by you."})]}),/*#__PURE__*/_jsxs("div",{children:[/*#__PURE__*/_jsx("h3",{children:"Other Users' Pending Topics"}),allPendingTopics.filter(topic=>topic.author!==userId).length>0?allPendingTopics.filter(topic=>topic.author!==userId).map(topic=>/*#__PURE__*/_jsxs("div",{style:{marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between'},children:[/*#__PURE__*/_jsxs("div",{style:{flexGrow:1,textAlign:'left'},children:[/*#__PURE__*/_jsx("strong",{children:topic.suggested_topic}),/*#__PURE__*/_jsx("br",{}),/*#__PURE__*/_jsxs("small",{children:["By: ",topic.author]})]}),/*#__PURE__*/_jsxs("div",{style:{display:'flex',alignItems:'center'},children:[/*#__PURE__*/_jsx("button",{onClick:()=>handleTopicAction(topic.id,'accept'),style:{marginRight:'5px',cursor:'pointer',border:'none',background:'none'},children:topicActions[topic.id]==='accept'?/*#__PURE__*/_jsx(AiFillCheckSquare,{style:{color:'green',fontSize:'24px'}}):/*#__PURE__*/_jsx("div",{style:{width:'24px',height:'24px',border:'2px solid green'}})}),/*#__PURE__*/_jsx("button",{onClick:()=>handleTopicAction(topic.id,'reject'),style:{cursor:'pointer',border:'none',background:'none'},children:topicActions[topic.id]==='reject'?/*#__PURE__*/_jsx(AiFillCloseSquare,{style:{color:'red',fontSize:'24px'}}):/*#__PURE__*/_jsx("div",{style:{width:'24px',height:'24px',border:'2px solid red'}})})]})]},topic.id)):/*#__PURE__*/_jsx("div",{children:"No pending topics submitted by other users."})]})]}),/*#__PURE__*/_jsx("div",{style:{display:'flex',justifyContent:'center'},children:/*#__PURE__*/_jsx("button",{onClick:handleSaveTopicReviews,style:{padding:'10px 20px',backgroundColor:'#5D6BE5',color:'white',border:'none',borderRadius:'5px',cursor:'pointer'},children:"Save My Choices"})})]})})]});}/* harmony default export */ const components_CommentSection_CommentSection = ((/* unused pure expression or super */ null && (CommentSection_CommentSection)));
;// CONCATENATED MODULE: ./src/App.js
function App_App(){const[role,setRole]=(0,react.useState)('L0');const[userId,setUserId]=(0,react.useState)('');const[isUserIdConfirmed,setIsUserIdConfirmed]=(0,react.useState)(false);const[showWarning,setShowWarning]=(0,react.useState)(false);(0,react.useEffect)(()=>{if(typeof chrome!=='undefined'&&chrome.storage){chrome.storage.sync.get(['selectedRole','userId'],result=>{if(result.selectedRole){setRole(result.selectedRole);}if(result.userId){setUserId(result.userId);setIsUserIdConfirmed(true);}});}},[]);const injectThreads=()=>{logger_logEvent('Inject Threads Clicked',userId,'threads_injection');chrome.tabs.query({active:true,currentWindow:true},tabs=>{const tab=tabs[0];if(tab&&tab.id!==undefined){chrome.tabs.sendMessage(tab.id,{action:'removeColorControl',payload:{userId:userId,level:role}},response=>{console.log(response);});}});};const handleChange=e=>{const selectedRole=e.target.value;setRole(selectedRole);logger_logEvent("Role Changed to ".concat(selectedRole),userId,'role_change');if(typeof chrome!=='undefined'&&chrome.storage){chrome.storage.sync.set({selectedRole:selectedRole},()=>{console.log('Role updated to:',selectedRole);});}};const extractArticleText=()=>{if(chrome&&chrome.runtime){chrome.runtime.sendMessage({action:'EXTRACT_ARTICLE_TEXT'},response=>{console.log('Message sent for text extraction');if(chrome.runtime.lastError){console.error('Error in sending message:',chrome.runtime.lastError);}});}else{console.error('Chrome runtime is not available.');}};const handleUserIdChange=e=>{const newUserId=e.target.value;setUserId(newUserId);// setIsUserIdConfirmed(false); // add if allow user change their usernames
};const confirmUserId=()=>{if(userId.trim()!==''){setIsUserIdConfirmed(true);logger_logEvent('UserId Confirmed',userId,'user_list');if(typeof chrome!=='undefined'&&chrome.storage){chrome.storage.sync.set({userId:userId},()=>{console.log('UserId saved:',userId);});}}};const handleAddThreads=()=>{if(!userId.trim()){setShowWarning(true);}else{extractArticleText();injectThreads();}};const closeWarning=()=>{setShowWarning(false);};return/*#__PURE__*/(0,jsx_runtime.jsx)("div",{className:"App",children:/*#__PURE__*/(0,jsx_runtime.jsxs)("header",{className:"App-header",children:[/*#__PURE__*/(0,jsx_runtime.jsx)("h1",{children:"Start Discussion"}),/*#__PURE__*/(0,jsx_runtime.jsxs)("div",{className:"userid-selection",children:[/*#__PURE__*/(0,jsx_runtime.jsx)("h2",{children:"Select Name"}),/*#__PURE__*/(0,jsx_runtime.jsxs)("div",{className:"userid-input",children:[/*#__PURE__*/(0,jsx_runtime.jsx)("input",{type:"text",value:userId,onChange:handleUserIdChange,placeholder:"Enter name"}),/*#__PURE__*/(0,jsx_runtime.jsx)("button",{onClick:confirmUserId,style:{backgroundColor:isUserIdConfirmed?'green':'blue'},children:isUserIdConfirmed?'DONE':'SET'})]})]}),/*#__PURE__*/(0,jsx_runtime.jsx)("button",{onClick:handleAddThreads,children:"Add Threads"}),showWarning&&/*#__PURE__*/(0,jsx_runtime.jsxs)("div",{className:"warning-popup",children:[/*#__PURE__*/(0,jsx_runtime.jsx)("p",{children:"Please fill out the name."}),/*#__PURE__*/(0,jsx_runtime.jsx)("button",{onClick:closeWarning,children:"OK"})]})]})});}/* harmony default export */ const src_App = (App_App);
;// CONCATENATED MODULE: ./src/reportWebVitals.js
const reportWebVitals=onPerfEntry=>{if(onPerfEntry&&onPerfEntry instanceof Function){__webpack_require__.e(/* import() */ 453).then(__webpack_require__.bind(__webpack_require__, 453)).then(_ref=>{let{getCLS,getFID,getFCP,getLCP,getTTFB}=_ref;getCLS(onPerfEntry);getFID(onPerfEntry);getFCP(onPerfEntry);getLCP(onPerfEntry);getTTFB(onPerfEntry);});}};/* harmony default export */ const src_reportWebVitals = (reportWebVitals);
;// CONCATENATED MODULE: ./src/index.js
const root=client.createRoot(document.getElementById('root'));root.render(/*#__PURE__*/(0,jsx_runtime.jsx)(react.StrictMode,{children:/*#__PURE__*/(0,jsx_runtime.jsx)(src_App,{})}));// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
src_reportWebVitals();
})();

/******/ })()
;
//# sourceMappingURL=main.js.map