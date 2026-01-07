import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { SearchBar } from "@/components/SearchBar";
import { CategorySidebar } from "@/components/CategorySidebar";
import { PromptCard } from "@/components/PromptCard";
import { PromptDetail } from "@/components/PromptDetail";
import { AddPromptDialog } from "@/components/AddPromptDialog";
import { LoginDialog } from "@/components/LoginDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { categories as mockCategories, prompts as initialPrompts } from "@/data/mockData";
import { Prompt, CurrentUser, Category } from "@/types/prompt";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, LogIn, User, LogOut } from "lucide-react";
import {
  promptsService,
  authService,
  votesService,
  categoriesService,
} from "@/lib/supabaseService";
import { isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const useSupabase = isSupabaseConfigured();

  // Refs for tracking mounted state and pending requests
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);
  const pendingFilterRef = useRef({ category: 'all', search: '' });

  // Initialize theme
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      setIsDark(saved === "dark");
    }
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initial setup - load data and setup auth listener
  useEffect(() => {
    if (!useSupabase) {
      setIsLoading(false);
      setPrompts(initialPrompts);
      setCategories(mockCategories);
      setIsInitialized(true);
      return;
    }

    const loadData = async () => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      setIsLoading(true);
      try {
        // First, try to load public data without authentication
        // This ensures the app works even if auth fails
        const [cats, promptsData] = await Promise.all([
          categoriesService.getCategories(),
          promptsService.getPublishedPrompts(),
        ]);

        if (!isMountedRef.current) return;

        setCategories(cats);
        setPrompts(promptsData);

        // Then, try to get current user in the background (non-blocking)
        // This won't affect the initial page load if it fails
        authService.getCurrentUser().then(user => {
          if (user && isMountedRef.current) {
            setCurrentUser(user);
            // Reload with user-specific data if user is found
            Promise.all([
              categoriesService.getCategories(),
              promptsService.getPublishedPromptsForUser(user.id),
            ]).then(([cats, prompts]) => {
              if (isMountedRef.current) {
                setCategories(cats);
                setPrompts(prompts);
              }
            }).catch(err => {
              console.error('Failed to load user-specific data:', err);
            });
          }
        }).catch(err => {
          console.error('Failed to get current user:', err);
        });
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn('Data loading was aborted');
          return;
        }
        console.error("Failed to load data:", error);
        // Fall back to mock data on error
        if (isMountedRef.current) {
          setPrompts(initialPrompts);
          setCategories(mockCategories);
        }
      } finally {
        isLoadingRef.current = false;
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsInitialized(true);
          pendingFilterRef.current = { category: activeCategory, search: searchQuery };
        }
      }
    };

    loadData();

    // Setup auth listener
    const { data } = authService.onAuthStateChange((user) => {
      if (!isMountedRef.current) return;
      setCurrentUser(user);
      if (user) {
        // Reload prompts when user logs in
        pendingFilterRef.current = { category: 'all', search: '' };
        loadPromptsData('all', '');
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [useSupabase]); // Only run when useSupabase changes (on mount)

  // Load prompts based on filter (only after initialization)
  useEffect(() => {
    if (!useSupabase || !isInitialized) return;

    const currentFilter = { category: activeCategory, search: searchQuery };
    const isDifferent =
      pendingFilterRef.current.category !== currentFilter.category ||
      pendingFilterRef.current.search !== currentFilter.search;

    if (isDifferent) {
      loadPromptsData(activeCategory, searchQuery);
    }
  }, [activeCategory, searchQuery, useSupabase, isInitialized]);

  const loadPromptsData = useCallback(async (category: string, search: string) => {
    if (!useSupabase || isLoadingRef.current) return;
    isLoadingRef.current = true;
    pendingFilterRef.current = { category, search };

    try {
      let data: Prompt[];

      if (search) {
        // For search, we'll use the basic method for now
        data = await promptsService.searchPrompts(search);
      } else if (category === 'all') {
        // Use appropriate method based on authentication
        data = currentUser
          ? await promptsService.getPublishedPromptsForUser(currentUser.id)
          : await promptsService.getPublishedPrompts();
      } else {
        data = await promptsService.getPromptsByCategory(category);
      }

      if (isMountedRef.current) {
        setPrompts(data);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error("Failed to load prompts:", error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [useSupabase, currentUser]);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  const filteredPrompts = useMemo(() => {
    if (useSupabase) {
      return prompts;
    }

    // Use client-side filtering for mock mode
    return prompts.filter((prompt) => {
      const matchesSearch =
        searchQuery === "" ||
        prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = activeCategory === "all" || prompt.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [prompts, searchQuery, activeCategory, useSupabase]);

  const handleVote = async (id: string, vote: 'up' | 'down') => {
    if (useSupabase && currentUser?.id) {
      try {
        await votesService.vote(id, vote, currentUser.id);

        // Optimistically update UI
        setPrompts((prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;

            const isTogglingOff = p.userVote === vote;
            const isChangingVote = p.userVote && p.userVote !== vote;

            let newUpvotes = p.upvotes;
            let newDownvotes = p.downvotes;
            let newUserVote: 'up' | 'down' | null = vote;

            if (isTogglingOff) {
              newUserVote = null;
              if (vote === 'up') newUpvotes--;
              if (vote === 'down') newDownvotes--;
            } else if (isChangingVote) {
              // Changing vote type
              if (p.userVote === 'up') newUpvotes--;
              if (p.userVote === 'down') newDownvotes--;
              if (vote === 'up') newUpvotes++;
              if (vote === 'down') newDownvotes++;
            } else {
              // New vote
              if (vote === 'up') newUpvotes++;
              if (vote === 'down') newDownvotes++;
            }

            return { ...p, upvotes: newUpvotes, downvotes: newDownvotes, userVote: newUserVote };
          })
        );

        // Refresh to get accurate counts from server
        await loadPromptsData(activeCategory, searchQuery);

        // Update selected prompt if open
        if (selectedPrompt?.id === id) {
          const updatedPrompt = await promptsService.getPromptById(id);
          if (updatedPrompt && isMountedRef.current) setSelectedPrompt(updatedPrompt);
        }
      } catch (error: any) {
        toast.error(error.message || "投票失败");
        // Revert optimistic update on error
        await loadPromptsData(activeCategory, searchQuery);
        return;
      }
    } else if (!useSupabase) {
      // Mock mode - local state update
      setPrompts((prev) =>
        prev.map((prompt) => {
          if (prompt.id !== id) return prompt;

          const currentVote = prompt.userVote;
          let newUpvotes = prompt.upvotes;
          let newDownvotes = prompt.downvotes;
          let newUserVote: 'up' | 'down' | null = vote;

          if (currentVote === 'up') newUpvotes--;
          if (currentVote === 'down') newDownvotes--;

          if (currentVote === vote) {
            newUserVote = null;
          } else {
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
    } else {
      toast.error("请先登录");
      setShowLoginDialog(true);
      return;
    }
  };

  const handleAddPrompt = async (newPrompt: Prompt) => {
    if (!currentUser?.id) {
      toast.error("请先登录");
      setShowLoginDialog(true);
      return;
    }

    if (useSupabase) {
      try {
        await promptsService.createPrompt(
          {
            title: newPrompt.title,
            description: newPrompt.description,
            content: newPrompt.content,
            category: newPrompt.category,
            tags: newPrompt.tags,
            published: true,
          },
          currentUser.id
        );
        toast.success("提示词添加成功");
        await loadPromptsData(activeCategory, searchQuery);
        const cats = await categoriesService.getCategories();
        if (isMountedRef.current) setCategories(cats);
      } catch (error: any) {
        toast.error(error.message || "添加失败");
        return;
      }
    } else {
      setPrompts((prev) => [newPrompt, ...prev]);
    }
  };

  const handleLogin = (user: CurrentUser) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    if (useSupabase) {
      await authService.signOut();
    }
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
                <p className="text-xs text-muted-foreground">
                  {useSupabase ? "Supabase 后端" : "内部提示词共享平台 (模拟模式)"}
                </p>
              </div>
            </div>
            <div className="flex-1 max-w-xl">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
              <Button
                onClick={() => {
                  if (currentUser) {
                    setShowAddDialog(true);
                  } else {
                    setShowLoginDialog(true);
                  }
                }}
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
                    {currentUser.role === 'admin' && (
                      <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">Admin</span>
                    )}
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
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        ) : (
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
        )}
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
