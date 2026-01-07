import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categories } from "@/data/mockData";
import { Prompt } from "@/types/prompt";
import { X } from "lucide-react";

interface AddPromptDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (prompt: Prompt) => void;
}

export const AddPromptDialog = ({ open, onClose, onAdd }: AddPromptDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !content || !category) return;

    const newPrompt: Prompt = {
      id: Date.now().toString(),
      title,
      description,
      content,
      category,
      tags,
      upvotes: 0,
      downvotes: 0,
      author: "当前用户",
      createdAt: new Date().toISOString().split("T")[0],
      userVote: null,
    };

    onAdd(newPrompt);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setContent("");
    setCategory("");
    setTags([]);
    setTagInput("");
  };

  const filteredCategories = categories.filter((c) => c.id !== "all");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            添加新提示词
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground">标题</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入提示词标题"
              className="bg-background border-border text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">简介</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简短描述提示词的用途"
              className="bg-background border-border text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content" className="text-foreground">提示词内容</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入完整的提示词内容..."
              className="bg-background border-border text-foreground min-h-[150px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-foreground">分类</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {filteredCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-foreground">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags" className="text-foreground">标签</Label>
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="输入标签后按回车添加"
              className="bg-background border-border text-foreground"
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="tag-chip flex items-center gap-1 pr-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:bg-muted rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit">
              添加提示词
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
