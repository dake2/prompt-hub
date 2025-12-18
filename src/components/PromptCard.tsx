import { Prompt } from "@/types/prompt";
import { ThumbsUp, ThumbsDown, Copy, User } from "lucide-react";
import { toast } from "sonner";

interface PromptCardProps {
  prompt: Prompt;
  onVote: (id: string, vote: 'up' | 'down') => void;
  onTagClick: (tag: string) => void;
  style?: React.CSSProperties;
}

export function PromptCard({ prompt, onVote, onTagClick, style }: PromptCardProps) {
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.content);
    toast.success("提示词已复制到剪贴板");
  };

  const handleVote = (e: React.MouseEvent, vote: 'up' | 'down') => {
    e.stopPropagation();
    onVote(prompt.id, vote);
  };

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    onTagClick(tag);
  };

  return (
    <div className="prompt-card animate-fade-in" style={style}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="font-semibold text-foreground text-lg leading-tight">{prompt.title}</h3>
        <button
          onClick={handleCopy}
          className="shrink-0 p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          title="复制提示词"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
      
      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{prompt.description}</p>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {prompt.tags.map((tag) => (
          <button
            key={tag}
            onClick={(e) => handleTagClick(e, tag)}
            className="tag-chip"
          >
            #{tag}
          </button>
        ))}
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <span>{prompt.author}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => handleVote(e, 'up')}
            className={`vote-button up ${prompt.userVote === 'up' ? 'active' : ''}`}
          >
            <ThumbsUp className="h-4 w-4" />
            <span>{prompt.upvotes}</span>
          </button>
          <button
            onClick={(e) => handleVote(e, 'down')}
            className={`vote-button down ${prompt.userVote === 'down' ? 'active' : ''}`}
          >
            <ThumbsDown className="h-4 w-4" />
            <span>{prompt.downvotes}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
