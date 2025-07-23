import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ZoomIn, ZoomOut, Download, Share2, User } from "lucide-react";

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  gender: "male" | "female";
  dob?: string;
  email?: string;
  isCurrentUser?: boolean;
  parentIds?: string[];
  spouseId?: string;
  children?: string[];
  x: number;
  y: number;
}

const FamilyTreeBuilder = () => {
  const [members, setMembers] = useState<FamilyMember[]>([
    {
      id: "1",
      name: "Arjun Rajesh",
      relation: "Self",
      gender: "male",
      dob: "1985-06-15",
      email: "arjun@example.com",
      isCurrentUser: true,
      x: 400,
      y: 300,
    },
    {
      id: "2",
      name: "Rajesh Kumar",
      relation: "Father",
      gender: "male",
      dob: "1955-03-20",
      children: ["1"],
      x: 300,
      y: 150,
    },
    {
      id: "3",
      name: "Sunita Devi",
      relation: "Mother",
      gender: "female",
      dob: "1960-08-10",
      spouseId: "2",
      children: ["1"],
      x: 500,
      y: 150,
    },
  ]);
  
  const [zoom, setZoom] = useState(1);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [newMember, setNewMember] = useState({
    name: "",
    relation: "",
    gender: "male" as "male" | "female",
    dob: "",
    email: "",
  });

  const handleAddMember = useCallback(() => {
    if (newMember.name && newMember.relation) {
      const id = Math.random().toString(36).substr(2, 9);
      const member: FamilyMember = {
        id,
        ...newMember,
        x: 400 + Math.random() * 200 - 100,
        y: 300 + Math.random() * 200 - 100,
      };
      
      setMembers(prev => [...prev, member]);
      setNewMember({ name: "", relation: "", gender: "male", dob: "", email: "" });
      setIsAddingMember(false);
    }
  }, [newMember]);

  const handleDeleteMember = useCallback((id: string) => {
    setMembers(prev => prev.filter(member => member.id !== id));
    setSelectedMember(null);
  }, []);

  const getMemberColor = (member: FamilyMember) => {
    if (member.isCurrentUser) return "bg-tree-current";
    return member.gender === "male" ? "bg-tree-male" : "bg-tree-female";
  };

  const zoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <Card className="shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-playfair">Family Tree Builder</CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={zoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2">{Math.round(zoom * 100)}%</span>
              <Button variant="outline" size="sm" onClick={zoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
              <Dialog open={isAddingMember} onOpenChange={setIsAddingMember}>
                <DialogTrigger asChild>
                  <Button variant="gradient" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Family Member</DialogTitle>
                    <DialogDescription>
                      Add a new member to your family tree
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={newMember.name}
                        onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="relation">Relation</Label>
                      <Select value={newMember.relation} onValueChange={(value) => setNewMember(prev => ({ ...prev, relation: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select relation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="father">Father</SelectItem>
                          <SelectItem value="mother">Mother</SelectItem>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="son">Son</SelectItem>
                          <SelectItem value="daughter">Daughter</SelectItem>
                          <SelectItem value="brother">Brother</SelectItem>
                          <SelectItem value="sister">Sister</SelectItem>
                          <SelectItem value="grandfather">Grandfather</SelectItem>
                          <SelectItem value="grandmother">Grandmother</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select value={newMember.gender} onValueChange={(value: "male" | "female") => setNewMember(prev => ({ ...prev, gender: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={newMember.dob}
                        onChange={(e) => setNewMember(prev => ({ ...prev, dob: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (Optional)</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newMember.email}
                        onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsAddingMember(false)}>
                        Cancel
                      </Button>
                      <Button variant="gradient" onClick={handleAddMember}>
                        Add Member
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tree Visualization */}
      <Card className="shadow-soft">
        <CardContent className="p-0">
          <div className="relative bg-muted/20 rounded-b-lg overflow-hidden" style={{ height: "600px" }}>
            <div 
              className="absolute inset-0"
              style={{ 
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
                transition: "transform 0.2s ease"
              }}
            >
              {/* Connection Lines */}
              <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
                {members.map(member => {
                  const lines = [];
                  
                  // Connect to spouse
                  if (member.spouseId) {
                    const spouse = members.find(m => m.id === member.spouseId);
                    if (spouse) {
                      lines.push(
                        <line
                          key={`spouse-${member.id}-${spouse.id}`}
                          x1={member.x + 50}
                          y1={member.y + 25}
                          x2={spouse.x + 50}
                          y2={spouse.y + 25}
                          stroke="hsl(var(--tree-connection))"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                        />
                      );
                    }
                  }
                  
                  // Connect to children
                  if (member.children) {
                    member.children.forEach(childId => {
                      const child = members.find(m => m.id === childId);
                      if (child) {
                        lines.push(
                          <line
                            key={`parent-${member.id}-${child.id}`}
                            x1={member.x + 50}
                            y1={member.y + 50}
                            x2={child.x + 50}
                            y2={child.y}
                            stroke="hsl(var(--tree-connection))"
                            strokeWidth="2"
                          />
                        );
                      }
                    });
                  }
                  
                  return lines;
                })}
              </svg>

              {/* Family Members */}
              {members.map(member => (
                <div
                  key={member.id}
                  className={`absolute cursor-pointer transition-transform hover:scale-105 ${selectedMember?.id === member.id ? 'ring-2 ring-primary' : ''}`}
                  style={{
                    left: member.x,
                    top: member.y,
                    zIndex: 2,
                  }}
                  onClick={() => setSelectedMember(member)}
                >
                  <div className={`w-24 h-12 rounded-lg ${getMemberColor(member)} text-white flex items-center justify-center text-xs font-medium shadow-md`}>
                    <User className="h-3 w-3 mr-1" />
                    {member.name.split(' ')[0]}
                  </div>
                  <div className="mt-1 text-center">
                    <Badge variant="secondary" className="text-xs">
                      {member.relation}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Member Details Panel */}
      {selectedMember && (
        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-playfair">Member Details</CardTitle>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                {!selectedMember.isCurrentUser && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDeleteMember(selectedMember.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                <p className="text-base font-medium">{selectedMember.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Relation</Label>
                <p className="text-base font-medium">{selectedMember.relation}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Gender</Label>
                <p className="text-base font-medium capitalize">{selectedMember.gender}</p>
              </div>
              {selectedMember.dob && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date of Birth</Label>
                  <p className="text-base font-medium">{new Date(selectedMember.dob).toLocaleDateString()}</p>
                </div>
              )}
              {selectedMember.email && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-base font-medium">{selectedMember.email}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FamilyTreeBuilder;