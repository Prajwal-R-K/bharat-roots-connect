import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TreePine, Users, Search, Shield, Heart, Star } from "lucide-react";
import heroImage from "@/assets/hero-family-tree.jpg";

const LandingPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TreePine className="h-8 w-8 text-primary" />
            <span className="text-2xl font-playfair font-bold text-primary">BharatRoots</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="transition-smooth">About</Button>
            <Button variant="ghost" className="transition-smooth">Features</Button>
            <Button variant="outline" className="transition-smooth">Sign In</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-90"></div>
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Family Tree Heritage" 
            className="w-full h-full object-cover opacity-30"
          />
        </div>
        <div className="relative container mx-auto px-4 text-center text-white">
          <h1 className="text-5xl md:text-7xl font-playfair font-bold mb-6 leading-tight">
            Discover Your <span className="text-accent">Heritage</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto opacity-90">
            Build, explore, and share your family tree with BharatRoots - 
            the social genealogy platform connecting generations
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" className="px-8 py-4 text-lg">
              Start Your Family Tree
            </Button>
            <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg">
              Explore Features
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-playfair font-bold mb-4 text-foreground">
              Why Choose BharatRoots?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful tools to build, discover, and preserve your family legacy
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="shadow-soft border-border/50 hover:shadow-elegant transition-spring">
              <CardHeader className="text-center">
                <TreePine className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle className="text-xl font-playfair">Interactive Family Trees</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-base">
                  Build beautiful, interactive family trees with drag-and-drop functionality, 
                  zoom controls, and dynamic relationship mapping.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border/50 hover:shadow-elegant transition-spring">
              <CardHeader className="text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle className="text-xl font-playfair">Connect with Relatives</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-base">
                  Discover distant relatives, send connection invites, and merge family trees 
                  to create comprehensive family networks.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border/50 hover:shadow-elegant transition-spring">
              <CardHeader className="text-center">
                <Search className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle className="text-xl font-playfair">Smart Search & Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-base">
                  Advanced relationship analysis, lineage reports, and intelligent search 
                  to understand complex family connections.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Authentication Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <Card className="shadow-elegant border-border">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-playfair">Join BharatRoots</CardTitle>
                <CardDescription>Start building your family legacy today</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={isLogin ? "login" : "signup"} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login" onClick={() => setIsLogin(true)}>Sign In</TabsTrigger>
                    <TabsTrigger value="signup" onClick={() => setIsLogin(false)}>Sign Up</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="login" className="space-y-4 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="your@email.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" placeholder="Enter your password" />
                    </div>
                    <Button variant="gradient" className="w-full">
                      Sign In
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="signup" className="space-y-4 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" placeholder="Your full name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" placeholder="your@email.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" type="password" placeholder="Create a password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input id="confirm-password" type="password" placeholder="Confirm your password" />
                    </div>
                    <Button variant="gradient" className="w-full">
                      Create Account
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 bg-muted/20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-8 opacity-60">
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Secure & Private</span>
            </div>
            <div className="flex items-center space-x-2">
              <Heart className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Family-First</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Trusted by Families</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <TreePine className="h-6 w-6" />
              <span className="text-xl font-playfair font-bold">BharatRoots</span>
            </div>
            <div className="text-sm opacity-80">
              © 2024 BharatRoots. Connecting families, preserving heritage.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;