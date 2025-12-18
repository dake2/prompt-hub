import { useState, useMemo } from "react";
import { SearchBar } from "@/components/SearchBar";
import { CategorySidebar } from "@/components/CategorySidebar";
import { PromptCard } from "@/components/PromptCard";
import { PromptDetail } from "@/components/PromptDetail";
import { categories, prompts as initialPrompts } from "@/data/mockData";
import { Prompt } from "@/types/prompt";
import { Sparkles } from "lucide-react";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);

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

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
  };

  return (
    <div className="min-h-screen bg-background dark">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-8">
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
            <div className="text-sm text-muted-foreground">
              共 <span className="font-semibold text-foreground">{prompts.length}</span> 个提示词
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
    </div>
  );
};

export default Index;
