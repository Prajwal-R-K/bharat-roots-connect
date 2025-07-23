import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TreePine, Users, Plus, Search, Settings, Bell, Share2, Download } from "lucide-react";
import FamilyTreeBuilder from "./FamilyTreeBuilder";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <TreePine className="h-8 w-8 text-primary" />
                <span className="text-2xl font-playfair font-bold text-primary">BharatRoots</span>
              </div>
              <Badge variant="secondary" className="hidden md:inline-flex">
                Premium Member
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground">AR</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="shadow-soft">
              <CardHeader className="text-center">
                <Avatar className="h-20 w-20 mx-auto mb-4">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">AR</AvatarFallback>
                </Avatar>
                <CardTitle className="font-playfair">Arjun Rajesh</CardTitle>
                <CardDescription>Family Tree Creator</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">47</div>
                    <div className="text-sm text-muted-foreground">Family Members</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">3</div>
                    <div className="text-sm text-muted-foreground">Generations</div>
                  </div>
                </div>
                <Button variant="gradient" className="w-full" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Family Member
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="mt-6 shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg font-playfair">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-start">
                  <Search className="h-4 w-4 mr-2" />
                  Find Relatives
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Tree
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Export Tree
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tree">Family Tree</TabsTrigger>
                <TabsTrigger value="connections">Connections</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Welcome Section */}
                <Card className="gradient-warm shadow-soft">
                  <CardHeader>
                    <CardTitle className="font-playfair text-2xl">Welcome back, Arjun!</CardTitle>
                    <CardDescription className="text-base">
                      Your family tree has grown by 3 members this month. Keep exploring your heritage!
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="gradient">
                      Continue Building Tree
                    </Button>
                  </CardContent>
                </Card>

                {/* Stats Cards */}
                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="shadow-soft">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Family Members</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">47</div>
                      <p className="text-xs text-muted-foreground">+3 from last month</p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-soft">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
                      <TreePine className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">12</div>
                      <p className="text-xs text-muted-foreground">Connected family trees</p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-soft">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
                      <Bell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-accent">5</div>
                      <p className="text-xs text-muted-foreground">Awaiting response</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="font-playfair">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-tree-female text-white">P</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Priya Sharma joined your family tree</p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-tree-male text-white">R</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Rahul Kumar updated his profile</p>
                        <p className="text-xs text-muted-foreground">1 day ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-tree-current text-white">S</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">New family photo added by Sunita Devi</p>
                        <p className="text-xs text-muted-foreground">3 days ago</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tree" className="mt-6">
                <FamilyTreeBuilder />
              </TabsContent>

              <TabsContent value="connections" className="mt-6">
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="font-playfair">Family Connections</CardTitle>
                    <CardDescription>
                      Connect with relatives and expand your family network
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No connections yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Start connecting with family members to build your network
                      </p>
                      <Button variant="gradient">
                        <Search className="h-4 w-4 mr-2" />
                        Find Relatives
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="mt-6">
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="font-playfair">Activity Feed</CardTitle>
                    <CardDescription>
                      Stay updated with your family tree activities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No recent activity</h3>
                      <p className="text-muted-foreground">
                        Activity from your family network will appear here
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;