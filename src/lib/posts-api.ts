// Family Posts API service
const API_BASE_URL = 'http://localhost:3001/api';

export interface FamilyPost {
  _id?: string;
  id: string;
  familyId: string;
  userId: string;
  userName: string;
  description: string;
  images: Array<{
    imageId: string;
    imageUrl: string;
    originalName: string;
  }>;
  likes: Array<{
    userId: string;
    userName: string;
    likedAt: Date;
  }>;
  comments: Array<{
    id: string;
    userId: string;
    userName: string;
    comment: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePostData {
  familyId: string;
  userId: string;
  userName: string;
  description?: string;
  images: File[];
}

// Helper function for API requests
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

// Create a new family post
export const createFamilyPost = async (postData: CreatePostData): Promise<FamilyPost> => {
  try {
    const formData = new FormData();
    formData.append('familyId', postData.familyId);
    formData.append('userId', postData.userId);
    formData.append('userName', postData.userName);
    if (postData.description) {
      formData.append('description', postData.description);
    }

    // Append images
    postData.images.forEach((image) => {
      formData.append('images', image);
    });

    const response = await fetch(`${API_BASE_URL}/posts/create`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return {
      ...result.post,
      createdAt: new Date(result.post.createdAt),
      updatedAt: new Date(result.post.updatedAt),
      likes: result.post.likes.map((like: any) => ({
        ...like,
        likedAt: new Date(like.likedAt)
      })),
      comments: result.post.comments.map((comment: any) => ({
        ...comment,
        createdAt: new Date(comment.createdAt)
      }))
    };
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

// Get family posts
export const getFamilyPosts = async (
  familyId: string,
  limit: number = 20,
  skip: number = 0
): Promise<FamilyPost[]> => {
  try {
    const response = await apiRequest(`/posts/${familyId}?limit=${limit}&skip=${skip}`);
    
    return response.map((post: any) => ({
      ...post,
      createdAt: new Date(post.createdAt),
      updatedAt: new Date(post.updatedAt),
      likes: post.likes.map((like: any) => ({
        ...like,
        likedAt: new Date(like.likedAt)
      })),
      comments: post.comments.map((comment: any) => ({
        ...comment,
        createdAt: new Date(comment.createdAt)
      }))
    }));
  } catch (error) {
    console.error('Error fetching family posts:', error);
    return [];
  }
};

// Toggle like on a post
export const togglePostLike = async (
  postId: string,
  userId: string,
  userName: string
): Promise<{ success: boolean; likes: any[] }> => {
  try {
    const response = await apiRequest(`/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, userName }),
    });

    return {
      success: response.success,
      likes: response.likes.map((like: any) => ({
        ...like,
        likedAt: new Date(like.likedAt)
      }))
    };
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
};

// Add comment to a post
export const addPostComment = async (
  postId: string,
  userId: string,
  userName: string,
  comment: string
): Promise<{ success: boolean; comment: any }> => {
  try {
    const response = await apiRequest(`/posts/${postId}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, userName, comment }),
    });

    return {
      success: response.success,
      comment: {
        ...response.comment,
        createdAt: new Date(response.comment.createdAt)
      }
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

// Get image URL with full path
export const getPostImageUrl = (imageUrl: string): string => {
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  return `${API_BASE_URL.replace('/api', '')}${imageUrl}`;
};
