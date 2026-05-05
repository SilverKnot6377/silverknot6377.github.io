export interface Video {
  id: number;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string | null;
  username: string;
  avatar_url?: string | null;
  likes: number;
  views: number;
  created_at: string;
  is_vip?: boolean;
}

export interface UserProfile {
  id: number;
  username: string;
  bio: string | null;
  website: string | null;
  twitter: string | null;
  instagram: string | null;
  avatar_url: string | null;
  email?: string | null;
  phone?: string | null;
  is_vip?: boolean;
  language?: string;
  currency?: string;
  followers_count: number;
  following_count: number;
  is_following?: boolean;
  created_at: string;
  videos?: Video[];
}

export interface Comment {
  id: number;
  video_id: number;
  username: string;
  content: string;
  avatar_url?: string | null;
  parent_id: number | null;
  created_at: string;
}

export interface CommunityPost {
  id: number;
  creator_id: number;
  author_id: number;
  author_username: string;
  author_avatar: string | null;
  content: string;
  created_at: string;
}
