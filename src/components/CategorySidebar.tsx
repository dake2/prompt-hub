import { Category } from "@/types/prompt";
import {
  LayoutGrid,
  PenLine,
  Code2,
  BarChart3,
  Palette,
  Headphones,
  Megaphone,
  Zap,
  Folder,
  LucideIcon
} from "lucide-react";

interface CategorySidebarProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

const iconMap: Record<string, LucideIcon> = {
  LayoutGrid,
  PenLine,
  Code2,
  BarChart3,
  Palette,
  HeadphonesIcon: Headphones,
  Megaphone,
  Zap,
  Grid3x3: LayoutGrid,
  Folder,
};

export function CategorySidebar({ categories, activeCategory, onCategoryChange }: CategorySidebarProps) {
  const getIcon = (iconName: string): LucideIcon => {
    return iconMap[iconName] || Folder;
  };
  return (
    <aside className="w-64 shrink-0">
      <div className="glass rounded-xl p-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-3">
          分类
        </h3>
        <nav className="space-y-1">
          {categories.map((category) => {
            const IconComponent = getIcon(category.icon);
            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`category-item w-full ${activeCategory === category.id ? 'active' : ''}`}
              >
                <IconComponent className="h-4 w-4" />
                <span className="flex-1 text-left">{category.name}</span>
                <span className="text-xs text-muted-foreground">{category.count}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
