export interface Prompt {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  upvotes: number;
  downvotes: number;
  author: string;
  createdAt: string;
  userVote?: 'up' | 'down' | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}
