import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, Network, ArrowRight, Heart } from 'lucide-react';
import { getFamilyMembers } from '@/lib/neo4j/family-tree';

interface FamilyMember {
  userId: string;
  name: string;
  email: string;
  gender?: string;
  profilePicture?: string;
}

interface RelationshipAnalyzerProps {
  familyId: string;
  currentUserId: string;
}

interface AnalysisResult {
  success: boolean;
  analysis?: string;
  path?: any;
  error?: string;
}

const RelationshipAnalyzer: React.FC<RelationshipAnalyzerProps> = ({ familyId, currentUserId }) => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [personA, setPersonA] = useState<string>('');
  const [personB, setPersonB] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMembers, setIsFetchingMembers] = useState(true);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch family members on mount
  useEffect(() => {
    const loadFamilyMembers = async () => {
      try {
        setIsFetchingMembers(true);
        const members = await getFamilyMembers(familyId);
        setFamilyMembers(members);
      } catch (err) {
        console.error('Error loading family members:', err);
        setError('Failed to load family members. Please refresh the page.');
      } finally {
        setIsFetchingMembers(false);
      }
    };

    if (familyId) {
      loadFamilyMembers();
    }
  }, [familyId]);

  const handleAnalyze = async () => {
    if (!personA || !personB) {
      setError('Please select both people');
      return;
    }

    if (personA === personB) {
      setError('Please select two different people');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch('http://localhost:3001/api/relationship/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personAId: personA,
          personBId: personB,
          familyId: familyId,
        }),
      });

      const data: AnalysisResult = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze relationship');
      }

      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
      } else {
        setError(data.error || 'No analysis available');
      }
    } catch (err) {
      console.error('Error analyzing relationship:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze relationship. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPersonA('');
    setPersonB('');
    setAnalysis(null);
    setError(null);
  };

  const isButtonDisabled = !personA || !personB || personA === personB || isLoading;

  const getPersonName = (userId: string) => {
    const person = familyMembers.find(m => m.userId === userId);
    return person?.name || 'Unknown';
  };

  if (isFetchingMembers) {
    return (
      <Card className="w-full border-isn-primary/20 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-isn-primary" />
            <span className="ml-3 text-lg">Loading family members...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (familyMembers.length === 0) {
    return (
      <Card className="w-full border-isn-primary/20 shadow-lg bg-gradient-to-br from-white to-isn-light/5">
        <CardHeader className="border-b border-isn-primary/10 bg-gradient-to-r from-isn-primary/5 to-isn-secondary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-isn-primary/10">
              <Heart className="h-6 w-6 text-isn-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-isn-primary">
                Find Your Relationship
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Discover how family members are connected
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert className="border-isn-secondary/30 bg-isn-secondary/5">
            <Users className="h-4 w-4 text-isn-secondary" />
            <AlertDescription className="text-isn-secondary">
              No family members found. Please add members to your family tree to use this feature.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-isn-primary/20 shadow-xl bg-gradient-to-br from-white via-isn-light/5 to-white hover:shadow-2xl transition-shadow duration-300">
      <CardHeader className="border-b border-isn-primary/10 bg-gradient-to-r from-isn-primary/5 via-isn-secondary/5 to-isn-primary/5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-isn-primary to-isn-secondary shadow-lg">
            <Heart className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-isn-primary to-isn-secondary bg-clip-text text-transparent">
              Find Your Relationship
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              Discover how two family members are connected
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {/* Selection Area */}
        <div className="bg-gradient-to-br from-isn-light/10 to-isn-secondary/5 p-6 rounded-xl border border-isn-primary/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Person A Selector */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-isn-primary flex items-center gap-2">
                <Users className="h-4 w-4" />
                First Person
              </label>
              <Select value={personA} onValueChange={setPersonA}>
                <SelectTrigger className="border-isn-primary/30 focus:border-isn-primary focus:ring-isn-primary/20 bg-white">
                  <SelectValue placeholder="Select first person" />
                </SelectTrigger>
                <SelectContent>
                  {familyMembers.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Arrow Icon */}
            <div className="hidden md:flex items-center justify-center">
              <div className="p-3 rounded-full bg-isn-primary/10">
                <Network className="h-6 w-6 text-isn-primary" />
              </div>
            </div>

            {/* Person B Selector */}
            <div className="space-y-3 md:col-start-2">
              <label className="text-sm font-semibold text-isn-primary flex items-center gap-2">
                <Users className="h-4 w-4" />
                Second Person
              </label>
              <Select value={personB} onValueChange={setPersonB}>
                <SelectTrigger className="border-isn-primary/30 focus:border-isn-primary focus:ring-isn-primary/20 bg-white">
                  <SelectValue placeholder="Select second person" />
                </SelectTrigger>
                <SelectContent>
                  {familyMembers.map((member) => (
                    <SelectItem 
                      key={member.userId} 
                      value={member.userId}
                      disabled={member.userId === personA}
                    >
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button
              onClick={handleAnalyze}
              disabled={isButtonDisabled}
              className="flex-1 bg-gradient-to-r from-isn-primary to-isn-secondary hover:from-isn-primary/90 hover:to-isn-secondary/90 text-white font-semibold py-6 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Finding Relationship...
                </>
              ) : (
                <>
                  <Heart className="mr-2 h-5 w-5" />
                  Find Relationship
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
            {(analysis || error) && (
              <Button 
                onClick={handleReset} 
                variant="outline"
                className="border-isn-primary/30 hover:bg-isn-primary/5 px-6"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Analysis Result */}
        {analysis && (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-isn-primary/5 via-isn-secondary/5 to-isn-primary/5 animate-pulse"></div>
            <Card className="relative border-2 border-isn-primary/30 shadow-2xl bg-gradient-to-br from-white via-isn-light/10 to-white">
              <CardHeader className="bg-gradient-to-r from-isn-primary/10 via-isn-secondary/10 to-isn-primary/10 border-b border-isn-primary/20">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-isn-primary">
                  <Heart className="h-6 w-6 text-isn-secondary" />
                  Relationship Found
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pb-3 border-b border-isn-primary/10">
                    <Users className="h-4 w-4 text-isn-primary" />
                    <span className="font-semibold text-isn-primary">{getPersonName(personA)}</span>
                    <ArrowRight className="h-4 w-4 text-isn-secondary" />
                    <span className="font-semibold text-isn-primary">{getPersonName(personB)}</span>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-base leading-relaxed text-gray-700 bg-gradient-to-r from-isn-light/20 to-transparent p-4 rounded-lg border-l-4 border-isn-primary">
                      {analysis}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RelationshipAnalyzer;
