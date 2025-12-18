import { Prompt } from "@/types/prompt";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, ThumbsUp, ThumbsDown, User, Calendar } from "lucide-react";
import { toast } from "sonner";

interface PromptDetailProps {
  prompt: Prompt | null;
  open: boolean;
  onClose: () => void;
  onVote: (id: string, vote: 'up' | 'down') => void;
}

export function PromptDetail({ prompt, open, onClose, onVote }: PromptDetailProps) {
  if (!prompt) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.content);
    toast.success("提示词已复制到剪贴板");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{prompt.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-muted-foreground">{prompt.description}</p>
          
          <div className="flex flex-wrap gap-2">
            {prompt.tags.map((tag) => (
              <span key={tag} className="tag-chip">
                #{tag}
              </span>
            ))}
          </div>
          
          <div className="relative">
            <pre className="bg-secondary/50 rounded-xl p-4 text-sm overflow-x-auto whitespace-pre-wrap font-mono">
              {prompt.content}
            </pre>
            <Button
              onClick={handleCopy}
              variant="secondary"
              size="sm"
              className="absolute top-3 right-3"
            >
              <Copy className="h-4 w-4 mr-2" />
              复制
            </Button>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                <span>{prompt.author}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{prompt.createdAt}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => onVote(prompt.id, 'up')}
                className={`vote-button up ${prompt.userVote === 'up' ? 'active' : ''}`}
              >
                <ThumbsUp className="h-4 w-4" />
                <span>{prompt.upvotes}</span>
              </button>
              <button
                onClick={() => onVote(prompt.id, 'down')}
                className={`vote-button down ${prompt.userVote === 'down' ? 'active' : ''}`}
              >
                <ThumbsDown className="h-4 w-4" />
                <span>{prompt.downvotes}</span>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
