import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { DragDropContext} from '@hello-pangea/dnd';
import CommentBox from '../CommentBox/CommentBox';
import './CommentThread.css';
import ReviewPage from '../level1/ReviewPage';
import SummarizeButton from '../level1/SummarizeBox';
import SummaryCollapse from '../level1/SummaryCollapse';
import axios from 'axios';

const CommentThread = ({ articleId, threadId, topic, onBack, level, userId,  question, color}) => {

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentCounter, setCommentCounter] = useState(0);
  const [showReviewPage, setShowReviewPage] = useState(false);

  const [acceptedReviews, setAcceptedReviews] = useState([]);

  const [replyingTo, setReplyingTo] = useState(null);
  const commentInputRef = useRef(null); // textarea

  useEffect(() => {
    if (replyingTo) {
      commentInputRef.current.focus();
    }
  }, [replyingTo]);

  // useEffect(() => {
  //   fetchComments();
  //   fetchAcceptedReviews();
  //   // const clusteringData = window.localStorage.getItem('clusteringData');
  //   // if (clusteringData) {
  //   //   setComments(JSON.parse(clusteringData));
  //   // }
  //   setCommentCounter(countAllComments(comments));
  // }, []);


  useEffect(() => {
    const localStorageKey = `clusteringData_${articleId}_${threadId}`;
    const clusteringData = window.localStorage.getItem(localStorageKey);
    if (clusteringData) {
      setComments(JSON.parse(clusteringData));
      setCommentCounter(countAllComments(JSON.parse(clusteringData)));
    } else {
      fetchComments();
    }
    fetchAcceptedReviews();
  }, []);

  const handleRefresh = async () => {
    try {
      await fetchComments();
      await fetchAcceptedReviews();
    } catch (error) {
      console.error('Error refreshing comments:', error);
    }
  }
  


  const fetchComments = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/articles/${articleId}/comments/${threadId}`);
      const data = response.data || []; 
      setComments(data);
      setCommentCounter(countAllComments(data));
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchAcceptedReviews = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/articles/${articleId}/reviews/${threadId}`);
      const acceptedReviews = response.data.filter((review) => !review.pendingReview);
      setAcceptedReviews(acceptedReviews);
    } catch (error) {
      console.error('Error fetching accepted reviews:', error);
    }
  };


  const countAllComments = (comments) => {
    let count = 0;
    const countChildComments = (comment) => {
      count++;
      if (comment.children && comment.children.length > 0) {
        comment.children.forEach(countChildComments);
      }
    };
    comments.forEach(countChildComments);
    return count;
  };

  const onDragEnd = async (result) => {
    const { destination, source } = result;
  
    if (!destination || source.droppableId === destination.droppableId ) return;
  
    try {
      const sourceComment = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/articles/${articleId}/comments/${threadId}/${source.droppableId.split('-')[1]}`);
      const destinationComment = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/articles/${articleId}/comments/${threadId}/${destination.droppableId.split('-')[1]}`);
  
      const sourceHasClusters = sourceComment.data.hasClusters;
      const sourceClusterId = sourceComment.data.cluster_id;
      const destinationHasClusters = destinationComment.data.hasClusters;
      const destinationClusterId = destinationComment.data.cluster_id;
  
      // Case 1: Both source and destination have hasClusters true
      if (sourceHasClusters && destinationHasClusters) {
        console.log("Auto reject 1 case");
        return;
      }
  
      // Case 2: Destination has a non-null cluster_id
      if (destinationClusterId !== null) {
        console.log("Auto rejected 2 case");
        return;
      }
  
      // Case 3: Destination has hasClusters false and cluster_id null, and source has hasClusters true
      if (!destinationHasClusters && destinationClusterId === null && sourceHasClusters) {
        console.log("Swapping source and destination");
        const reviewObj = {
          article_id: articleId, 
          thread_id: threadId,
          author: userId,
          timestamp: new Date(),
          sourceId: parseInt(destination.droppableId.split('-')[1]),
          destinationId: parseInt(source.droppableId.split('-')[1]),
          pendingReview: true,
          newOrder: [],
          prevOrder: [],
          acceptedBy: [],
          deniedBy: []
        };
        await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/articles/${articleId}/reviews/${threadId}`, reviewObj);
      } else {
        const reviewObj = {
          article_id: articleId, 
          thread_id: threadId,
          author: userId,
          timestamp: new Date(),
          sourceId: parseInt(source.droppableId.split('-')[1]),
          destinationId: parseInt(destination.droppableId.split('-')[1]),
          pendingReview: true,
          newOrder: [],
          prevOrder: [],
          acceptedBy: [],
          deniedBy: [],
          summary: null
        };
        await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/articles/${articleId}/reviews/${threadId}`, reviewObj);
      }

      // Update client-side clustering
    const updatedComments = comments.map((comment) => {
      if (comment.id === parseInt(destination.droppableId.split('-')[1])) {
        return {
          ...comment,
          cluster_id: parseInt(draggableId.split('-')[1]),
        };
      }
      return comment;
    });

    // Store the updated comments in local storage
    const localStorageKey = `clusteringData_${articleId}_${threadId}`;
    window.localStorage.setItem(localStorageKey, JSON.stringify(updatedComments));

    setComments(updatedComments);
    setCommentCounter(countAllComments(updatedComments));

      // fetchComments();
    } catch (error) {
      console.error('Error updating comment order:', error);
    }
  };
  
  const handleAddComment = async () => {
    if (newComment.trim()) {
      try {
        const timestamp = new Date();
        const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/articles/${articleId}/${threadId}/comments`, {
          thread_id: threadId,
          text: newComment,
          author: userId,
          timestamp: timestamp,
          upvotes: [],
          children: [],
          cluster_id: null,
          article_id: articleId,
          children_id: replyingTo ? replyingTo : null,
          hasClusters: false,
        });
        setComments([...comments, response.data]);
        setNewComment('');
        setCommentCounter(commentCounter + 1);
        setReplyingTo(null);
      } catch (error) {
        console.error('Error adding comment:', error);
      }
    }
  };
   
  // for replies
  const handleReplyClick = (commentId) => {
    console.log("replying to", commentId || null);
    setReplyingTo(commentId);
    setTimeout(() => commentInputRef.current.focus(), 0);
  };

  if (showReviewPage && level === "L1") {
    return (
      <ReviewPage 
        articleId={articleId}
        threadId={threadId}
        onBack={() => setShowReviewPage(false)} 
        userId={userId}
        header={
          <>
            <h2>{topic}</h2>
            <HeaderUnderline />
            <div>
              {commentCounter} comments 
              <span style={{ fontWeight: "bold", marginLeft: "5px" }}>
                (REVIEWING)
              </span>
            </div>
          </>
        }
      />
    );
  }

  const handleBack = () => {
    const localStorageKey = `clusteringData_${articleId}_${threadId}`;
    if (window.localStorage.getItem(localStorageKey)) {
      window.localStorage.removeItem(localStorageKey);
    }
    onBack();
  };

  return (
    <div className="comment-thread-container">
      <ButtonContainer>
      <BackButton onClick={handleBack}>
        <BackIcon>&larr;</BackIcon>
        Back
      </BackButton>
      <RefreshButton onClick={handleRefresh}>
        <RefreshIcon>&#8635;</RefreshIcon>
        Refresh
      </RefreshButton>
      </ButtonContainer>
      <ThreadHeader className="thread-header">
        <h2>{topic}</h2>
      </ThreadHeader>
      <div className="heading-underline" style={{ backgroundColor: color }}></div>
      <div className="random-question">{question}</div>
      <div style={{ display: 'flex', justifyContent:'space-between', alignItems: 'center' }}>
      {comments && comments.length > 0 && <div className="comment-count">{commentCounter} comments</div>}
      {level === "L1" && (
         <div style={{ display: 'flex', justifyContent: 'flex-end', flex: 1 }}>
         <ReviewButton onClick={() => setShowReviewPage(true)}>Review clustered comments &gt;&gt;</ReviewButton>
       </div>
      )} 
      </div>
      {comments && comments.length === 0 ? (
        <div className="no-comments">
          <p>No Comments</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
        <CommentsContainer>
        {comments
          .filter((comment) => comment.children_id === null && comment.cluster_id === null)
          .map((comment, index) => {
            const replies = comments.filter(
              (c) => c.children_id === comment.id
            );
            const clusteredComments = comments.filter(
              (c) => c.cluster_id === comment.id
            );
            
            // Check if the cluster is accepted
            const isClusterAccepted = acceptedReviews.some(
              (review) => review.destinationId === comment.id
            );

            // Find the accepted review that matches the comment's sourceId
            const acceptedReview = acceptedReviews.find(
              (review) => review.destinationId === comment.id
            );

            return (
              <React.Fragment key={comment.id}>
                {clusteredComments.length > 0 ? (
                  <CombinedCommentContainer>
                  {acceptedReview && acceptedReview.summary ? (
                    <>
                      <SummaryCollapse
                        summary={acceptedReview.summary}
                        comment={comment}
                        clusteredComments={clusteredComments}
                      />
                      <ReviewMessage>This change has been accepted and summarized</ReviewMessage>
                    </>
                  ) : (
                    <CommentBox
                      articleId={articleId}
                      threadId={threadId}
                      comment={comment}
                      index={index}
                      clusteredComments={clusteredComments}
                      childrenComments={replies}
                      userId={userId}
                      onReplyClick={handleReplyClick}
                    />
                  )}
                  {level === 'L0' || level === 'L2' ? (
                    isClusterAccepted && !acceptedReview?.summary ? (
                      <ReviewMessage>This change has been accepted but not summarized</ReviewMessage>
                    ) : null
                  ) : (
                    level === 'L1' && isClusterAccepted && !acceptedReview?.summary && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <SummarizeButton
                          articleId={articleId}
                          threadId={threadId}
                          comment={comment}
                          clusteredComments={clusteredComments}
                          reviewId={acceptedReview.id}
                        />
                      </div>
                    )
                  )}
                </CombinedCommentContainer>

                ) : (
                  <CommentBox
                    articleId={articleId}
                    threadId={threadId}
                    comment={comment}
                    index={index}
                    childrenComments={replies}
                    clusteredComments={[]}
                    userId={userId}
                    onReplyClick={handleReplyClick}
                  />
                )}
              </React.Fragment>
            );
          })}
        </CommentsContainer>
        </DragDropContext>
      )}
      <Separator />
      <CommentBoxContainer>
        <UserProfile>{userId.charAt(0).toUpperCase() || 'A'}</UserProfile>
        <CommentInputContainer>
          <CommentInput
            ref={commentInputRef}
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault(); // Prevents newline from being added
                handleAddComment();
              }
            }}
          />
          <CommentActions>
            <AddCommentButton onClick={handleAddComment}>
              POST
            </AddCommentButton>
          </CommentActions>
        </CommentInputContainer>
      </CommentBoxContainer>
    </div>
  );
};

export default CommentThread;




const CommentBoxContainer = styled.div`
  display: flex;
  align-items: flex-start;
  margin-top: 20px;
  width: 100%;
`;

const CommentInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 10px;
  width: 100%;
`;

const CommentInput = styled.textarea`
  width: 100%;
  height: 60px;
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  box-sizing: border-box;
`;

const CommentActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
`;

const UserProfile = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: black;
  font-weight: bold;
  margin-top: 10px;
  flex-shrink: 0;
`;

const AddCommentButton = styled.button`
  width: 100%;
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  box-sizing: border-box;
`;

const Separator = styled.hr`
  width: 100%;
  border: 0;
  height: 1px;
  background: #ccc;
  margin: 20px 0;
`;

const ThreadHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 15px;
  display: flex;
  align-items: center;
`;

const BackIcon = styled.span`
  margin-right: 5px;
  font-size: 15px;
`;

const CombinedCommentContainer = styled.div`
  padding: 10px;
  margin: 10px 0;
  background-color: #D9DBF4;
  border: 1px solid lightgray;
`;

const ReviewMessage = styled.div`
  font-size: 12px;
  color: #555;
  margin-top: 10px;
  margin-right: 5px;
  text-align: right;
`;

const CommentsContainer = styled.div`
  margin-top: 10px;
  // border-radius: 5px;
  padding: 10px;
  // background-color: ${(props) => (props.isDraggingOver ? 'lightblue' : 'lightgrey')};
  background-color: #F2F2F2;
  //  border: 2px solid #000;
`;
const ReviewButton = styled.button`
  background-color: #5D6BE5;
  color: white;
  border: none;
  padding: 4px 5px;
  margin: 5px 0;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
`;

const HeaderUnderline = styled.div`
  width: 120%;
  height: 2px;
  background-color: ${(props) => props.color};
  margin-bottom: 10px;
`;

const RefreshButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 15px;
  display: flex;
  align-items: center;
  margin-left: 10px;
`;

const RefreshIcon = styled.span`
  margin-right: 5px;
  font-size: 15px;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;
