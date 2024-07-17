from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class LogEntry(BaseModel):
    id: str
    user_id: str
    action: str
    folder_name: str
    timestamp: datetime

    class Config:
        from_attributes = True

class CommentBase(BaseModel):
    text: str
    author: str
    timestamp: datetime
    upvotes: int
    children: List = []
    cluster_id: Optional[int] = None 

class CommentCreate(CommentBase):
    thread_id: int

class CommentResponse(CommentBase):
    id: int
    thread_id: int

    class Config:
        from_attributes = True
        

class ThreadBase(BaseModel):
    topic: str

class ThreadCreate(ThreadBase):
    pass

class ThreadResponse(ThreadBase):
    id: int
    comments: List[CommentResponse] = []

    class Config:
        from_attributes = True
        
class ReviewBase(BaseModel):
    prevOrder: List[int]
    newOrder: List[CommentBase]
    sourceId: int
    destinationId: int
    pendingReview: bool 
    
class ReviewCreate(ReviewBase):
    acceptedBy: List[str] = []
    deniedBy: List[str] = []
    author: str
    timestamp: datetime
    new_order_dicts: List[dict] = []

class ReviewUpdate(BaseModel):
    acceptedBy: Optional[List[str]] = None
    deniedBy: Optional[List[str]] = None
    summary: Optional[str] = None


class ReviewResponse(ReviewBase):
    id: int
    acceptedBy: List[str] = []
    deniedBy: List[str] = []
    author: str
    timestamp: datetime 
    summary: Optional[str] = None

    class Config:
        from_attributes = True