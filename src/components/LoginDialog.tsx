import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { authService } from "@/lib/supabaseService";
import type { CurrentUser } from "@/types/prompt";
import { isSupabaseConfigured } from "@/lib/supabase";

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onLogin: (user: CurrentUser) => void;
}

export const LoginDialog = ({ open, onClose, onLogin }: LoginDialogProps) => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;

    setIsLoading(true);
    try {
      const user = await authService.signIn({
        email: loginEmail,
        password: loginPassword,
      });
      onLogin(user);
      toast.success("登录成功");
      resetForm();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "登录失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName || !registerEmail || !registerPassword) return;

    setIsLoading(true);
    try {
      const user = await authService.signUp({
        email: registerEmail,
        password: registerPassword,
        name: registerName,
      });
      onLogin(user);
      toast.success("注册成功");
      resetForm();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "注册失败");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setLoginEmail("");
    setLoginPassword("");
    setRegisterName("");
    setRegisterEmail("");
    setRegisterPassword("");
  };

  // If Supabase is not configured, show mock mode
  if (!isSupabaseConfigured()) {
    const handleMockLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (!loginEmail || !loginPassword) return;
      onLogin({ name: loginEmail.split("@")[0], email: loginEmail });
      toast.success("登录成功 (模拟模式)");
      resetForm();
      onClose();
    };

    const handleMockRegister = (e: React.FormEvent) => {
      e.preventDefault();
      if (!registerName || !registerEmail || !registerPassword) return;
      onLogin({ name: registerName, email: registerEmail });
      toast.success("注册成功 (模拟模式)");
      resetForm();
      onClose();
    };

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground text-center">
              欢迎使用 (模拟模式)
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            Supabase 未配置。使用模拟模式 - 数据不会持久化。
          </div>

          <Tabs defaultValue="login" className="mt-4">
            <TabsList className="grid w-full grid-cols-2 bg-muted">
              <TabsTrigger value="login" className="data-[state=active]:bg-background">
                登录
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-background">
                注册
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleMockLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-foreground">邮箱</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="bg-background border-border text-foreground"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-foreground">密码</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-background border-border text-foreground"
                    required
                  />
                </div>
                <Button type="submit" className="w-full mt-6">
                  登录
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-6">
              <form onSubmit={handleMockRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name" className="text-foreground">用户名</Label>
                  <Input
                    id="register-name"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="输入用户名"
                    className="bg-background border-border text-foreground"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-foreground">邮箱</Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="bg-background border-border text-foreground"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-foreground">密码</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-background border-border text-foreground"
                    required
                  />
                </div>
                <Button type="submit" className="w-full mt-6">
                  注册
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground text-center">
            欢迎使用
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="login" className="mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-muted">
            <TabsTrigger value="login" className="data-[state=active]:bg-background">
              登录
            </TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-background">
              注册
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-foreground">邮箱</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="bg-background border-border text-foreground"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-foreground">密码</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-background border-border text-foreground"
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                {isLoading ? "登录中..." : "登录"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="mt-6">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-name" className="text-foreground">用户名</Label>
                <Input
                  id="register-name"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  placeholder="输入用户名"
                  className="bg-background border-border text-foreground"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email" className="text-foreground">邮箱</Label>
                <Input
                  id="register-email"
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="bg-background border-border text-foreground"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password" className="text-foreground">密码</Label>
                <Input
                  id="register-password"
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-background border-border text-foreground"
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                {isLoading ? "注册中..." : "注册"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
