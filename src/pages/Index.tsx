import { useState, useMemo, useEffect } from "react";
import { SearchBar } from "@/components/SearchBar";
import { CategorySidebar } from "@/components/CategorySidebar";
import { PromptCard } from "@/components/PromptCard";
import { PromptDetail } from "@/components/PromptDetail";
import { AddPromptDialog } from "@/components/AddPromptDialog";
import { LoginDialog } from "@/components/LoginDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { categories, prompts as initialPrompts } from "@/data/mockData";
import { Prompt } from "@/types/prompt";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, LogIn, User, LogOut } from "lucide-react";

interface CurrentUser {
  name: string;
  email: string;
}

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      setIsDark(saved === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  const filteredPrompts = useMemo(() => {
    return prompts.filter((prompt) => {
      const matchesSearch =
        searchQuery === "" ||
        prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = activeCategory === "all" || prompt.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [prompts, searchQuery, activeCategory]);

  const handleVote = (id: string, vote: 'up' | 'down') => {
    setPrompts((prev) =>
      prev.map((prompt) => {
        if (prompt.id !== id) return prompt;

        const currentVote = prompt.userVote;
        let newUpvotes = prompt.upvotes;
        let newDownvotes = prompt.downvotes;
        let newUserVote: 'up' | 'down' | null = vote;

        // Remove previous vote
        if (currentVote === 'up') newUpvotes--;
        if (currentVote === 'down') newDownvotes--;

        // Toggle off if clicking same vote
        if (currentVote === vote) {
          newUserVote = null;
        } else {
          // Add new vote
          if (vote === 'up') newUpvotes++;
          if (vote === 'down') newDownvotes++;
        }

        return {
          ...prompt,
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          userVote: newUserVote,
        };
      })
    );
  };

  const handleAddPrompt = (newPrompt: Prompt) => {
    setPrompts((prev) => [newPrompt, ...prev]);
  };

  const handleLogin = (user: CurrentUser) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
  };

  return (
    <div className={`min-h-screen bg-background ${isDark ? "dark" : ""}`}>
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">AI 提示词市场</h1>
                <p className="text-xs text-muted-foreground">内部提示词共享平台</p>
              </div>
            </div>
            <div className="flex-1 max-w-xl">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
              <Button
                onClick={() => setShowAddDialog(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                添加提示词
              </Button>
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{currentUser.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setShowLoginDialog(true)} className="gap-2">
                  <LogIn className="h-4 w-4" />
                  登录
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <CategorySidebar
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          {/* Prompt Grid */}
          <div className="flex-1">
            {filteredPrompts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">没有找到匹配的提示词</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {filteredPrompts.map((prompt, index) => (
                  <div
                    key={prompt.id}
                    onClick={() => setSelectedPrompt(prompt)}
                    className="cursor-pointer"
                  >
                    <PromptCard
                      prompt={prompt}
                      onVote={handleVote}
                      onTagClick={handleTagClick}
                      style={{ animationDelay: `${index * 50}ms` }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      <PromptDetail
        prompt={selectedPrompt}
        open={!!selectedPrompt}
        onClose={() => setSelectedPrompt(null)}
        onVote={handleVote}
      />

      {/* Add Prompt Dialog */}
      <AddPromptDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAddPrompt}
      />

      {/* Login Dialog */}
      <LoginDialog
        open={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        onLogin={handleLogin}
      />
    </div>
  );
};

export default Index;
