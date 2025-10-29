import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Maximize2, Minimize2, X, Crown, TreePine, Link2, Building2, Mouse, Hand, Search, Users, ArrowLeftRight } from 'lucide-react';
import FamilyTreeVisualization from './FamilyTreeVisualization1';

interface FamilyTreeNode {
  familyTreeId: string;
  memberCount: number | any;
  connectionCount: number | any;
  isCurrentTree: boolean;
  creatorName?: string;
}

// Helper to convert Neo4j Integer to JavaScript number
const toNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && 'low' in val) return val.low;
  return Number(val) || 0;
}

interface TreeConnection {
  sourceFamilyTreeId: string;
  targetFamilyTreeId: string;
  relationshipType: string;
  sourceUserName: string;
  targetUserName: string;
}

interface Props {
  currentUser: User;
  trees: FamilyTreeNode[];
  connections: TreeConnection[];
  minHeight?: string;
  onTreeClick?: (familyTreeId: string) => void;
}

const FamilyTreeMetaGraph: React.FC<Props> = ({ currentUser, trees, connections, minHeight = "600px", onTreeClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTree, setSelectedTree] = useState<FamilyTreeNode | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<TreeConnection[]>([]);
  const [selectedTreeData, setSelectedTreeData] = useState<{ members: any[], relationships: any[] } | null>(null);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<{ tree: FamilyTreeNode; x: number; y: number } | null>(null);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Function to fetch tree data for visualization
  const fetchTreeData = async (familyTreeId: string) => {
    setIsLoadingTree(true);
    try {
      // Import the functions dynamically to avoid circular deps
      const { getFamilyMembers, getTraversableFamilyTreeData } = await import('@/lib/neo4j');
      
      const members = await getFamilyMembers(familyTreeId);
      const treeData = await getTraversableFamilyTreeData(familyTreeId);
      
      setSelectedTreeData({
        members: members || [],
        relationships: (treeData?.links || []) as any[]
      });
    } catch (error) {
      console.error('Error fetching tree data:', error);
      setSelectedTreeData({ members: [], relationships: [] });
    } finally {
      setIsLoadingTree(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current || trees.length === 0) return;

    // Create elements for cytoscape
    const elements: any[] = [];

    // Add family tree nodes
    trees.forEach(tree => {
      elements.push({
        data: {
          id: tree.familyTreeId,
          label: tree.isCurrentTree 
            ? `Your Family Tree\nID: ${tree.familyTreeId}\n${toNumber(tree.memberCount)} members\n${toNumber(tree.connectionCount)} connections` 
            : `Family Tree\nID: ${tree.familyTreeId}\n${toNumber(tree.memberCount)} members\n${toNumber(tree.connectionCount)} connections`,
          memberCount: toNumber(tree.memberCount),
          connectionCount: toNumber(tree.connectionCount),
          isCurrentTree: tree.isCurrentTree,
          creatorName: tree.creatorName || 'Unknown',
          familyTreeId: tree.familyTreeId
        }
      });
    });

    // Add connection edges
    connections.forEach((conn, idx) => {
      elements.push({
        data: {
          id: `edge-${idx}`,
          source: conn.sourceFamilyTreeId,
          target: conn.targetFamilyTreeId,
          relationshipType: conn.relationshipType,
          label: `${conn.sourceUserName} <-> ${conn.targetUserName}`,
          sourceUserName: conn.sourceUserName,
          targetUserName: conn.targetUserName
        }
      });
    });

    // Initialize cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#667eea',
            'border-width': 5,
            'border-color': '#8b5cf6',
            'border-style': 'solid',
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#ffffff',
            'font-size': 13,
            'font-weight': 'bold',
            'text-wrap': 'wrap',
            'text-max-width': 140,
            'width': 200,
            'height': 200,
            'shape': 'hexagon',
            'padding': '12px',
            'transition-property': 'border-width, border-color, background-color, width, height',
            'transition-duration': '0.3s',
            'transition-timing-function': 'ease-in-out',
            'shadow-blur': 20,
            'shadow-color': 'rgba(138, 43, 226, 0.4)',
            'shadow-offset-x': 0,
            'shadow-offset-y': 4,
            'shadow-opacity': 0.6
          }
        },
        {
          selector: 'node[isCurrentTree = true]',
          style: {
            'background-color': '#f59e0b',
            'border-width': 7,
            'border-color': '#d97706',
            'width': 220,
            'height': 220,
            'shadow-blur': 25,
            'shadow-color': 'rgba(245, 158, 11, 0.5)',
            'shadow-offset-y': 6
          }
        },
        {
          selector: 'node:hover',
          style: {
            'border-width': 9,
            'border-color': '#10b981',
            'z-index': 999,
            'width': 210,
            'height': 210,
            'shadow-blur': 30,
            'shadow-color': 'rgba(16, 185, 129, 0.6)',
            'shadow-offset-y': 8
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 4,
            'line-color': '#10b981',
            'line-style': 'solid',
            'line-gradient-stop-colors': '#10b981 #6ee7b7',
            'line-gradient-stop-positions': '0% 100%',
            'target-arrow-color': '#10b981',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 1.5,
            'curve-style': 'bezier',
            'control-point-step-size': 80,
            'label': 'data(label)',
            'font-size': 11,
            'color': '#047857',
            'font-weight': '600',
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.95,
            'text-background-padding': '4px',
            'text-border-width': 1.5,
            'text-border-color': '#d1fae5',
            'text-border-opacity': 1,
            'text-background-shape': 'roundrectangle',
            'transition-property': 'width, line-color',
            'transition-duration': '0.3s'
          }
        },
        {
          selector: 'edge:hover',
          style: {
            'width': 6,
            'line-color': '#059669',
            'z-index': 998
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 8,
            'border-color': '#f59e0b',
            'background-color': '#fbbf24',
            'shadow-blur': 35,
            'shadow-color': 'rgba(245, 158, 11, 0.7)'
          }
        },
        {
          selector: '.highlighted',
          style: {
            'border-width': 8,
            'border-color': '#3b82f6',
            'z-index': 900
          }
        },
        {
          selector: 'edge.highlighted',
          style: {
            'width': 6,
            'line-color': '#3b82f6',
            'z-index': 899
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 800,
        animationEasing: 'ease-in-out-cubic',
        nodeDimensionsIncludeLabels: true,
        nodeRepulsion: 10000,
        idealEdgeLength: 250,
        edgeElasticity: 120,
        nestingFactor: 1.2,
        gravity: 0.8,
        numIter: 1200,
        initialTemp: 250,
        coolingFactor: 0.96,
        minTemp: 1.0,
        randomize: false,
        componentSpacing: 150,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 50
      } as any,
      wheelSensitivity: 0.15,
      minZoom: 0.2,
      maxZoom: 4,
      pixelRatio: 'auto',
      motionBlur: true,
      motionBlurOpacity: 0.2,
      textureOnViewport: true,
      hideEdgesOnViewport: false,
      hideLabelsOnViewport: false
    });

    cyRef.current = cy;

    // Add hover handlers for nodes with highlighting
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      const data = node.data();
      const treeNode = trees.find(t => t.familyTreeId === data.id);
      
      // Highlight connected nodes and edges
      node.addClass('highlighted');
      node.connectedEdges().addClass('highlighted');
      node.neighborhood('node').addClass('highlighted');
      
      if (treeNode) {
        setHoverInfo({
          tree: treeNode,
          x: 0,
          y: 0
        });
      }
    });

    cy.on('mouseout', 'node', (evt) => {
      const node = evt.target;
      
      // Remove highlighting
      cy.elements().removeClass('highlighted');
      
      setHoverInfo(null);
    });

    // Add click handlers for nodes
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const data = node.data();
      console.log('Family Tree clicked:', data);
      
      const treeNode = trees.find(t => t.familyTreeId === data.id);
      if (treeNode) {
        setSelectedTree(treeNode);
        
        // Find all connections involving this tree
        const relevantConnections = connections.filter(
          c => c.sourceFamilyTreeId === data.id || c.targetFamilyTreeId === data.id
        );
        setConnectionDetails(relevantConnections);
        
        // Fetch the tree data for visualization
        fetchTreeData(data.id);
        
        if (onTreeClick) {
          onTreeClick(data.id);
        }
      }
    });

    cy.on('tap', 'edge', (evt) => {
      const edge = evt.target;
      const data = edge.data();
      console.log('Connection clicked:', data);
    });

    // Fit to viewport
    setTimeout(() => {
      cy.fit(undefined, 50);
    }, 100);

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [trees, connections]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Resize cytoscape after animation
    setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.resize();
        cyRef.current.fit(undefined, 50);
      }
    }, 100);
  };

  if (trees.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
        <div className="text-center">
          <p className="text-lg text-slate-600 mb-2">No Connected Family Trees</p>
          <p className="text-sm text-slate-500">This family tree has no interconnections yet.</p>
        </div>
      </div>
    );
  }

  const containerHeight = isFullscreen ? '100vh' : minHeight;

  return (
    <>
      <div className={isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'relative w-full'} style={isFullscreen ? { height: '100vh' } : { minHeight: containerHeight }}>
        <div ref={containerRef} className={isFullscreen ? 'w-full h-full' : 'w-full h-full rounded-lg border border-slate-200'} style={isFullscreen ? { height: '100vh' } : { minHeight: containerHeight }} />
        
        {/* Controls */}
        <div className="absolute top-4 left-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="bg-white shadow-lg"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="ml-2">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </Button>
        </div>

        {/* Enhanced Stats with Animation */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-white to-slate-50 rounded-xl shadow-2xl px-6 py-3 border border-slate-200 backdrop-blur-sm">
          <div className="flex gap-8 text-sm">
            <div className="text-center group hover:scale-110 transition-transform duration-300">
              <div className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {toNumber(trees.length)}
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-1">
                <TreePine className="w-3 h-3 group-hover:animate-bounce" />
                Family Trees
              </div>
            </div>
            <div className="h-10 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent"></div>
            <div className="text-center group hover:scale-110 transition-transform duration-300">
              <div className="font-bold text-2xl bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                {toNumber(connections.length)}
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-1">
                <Link2 className="w-3 h-3 group-hover:animate-pulse" />
                Connections
              </div>
            </div>
          </div>
        </div>
        
        {/* Legend with Icons */}
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-4 border border-slate-200">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-600" />
            Legend
          </h3>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-amber-50 transition-colors">
              <div className="relative">
                <div className="w-5 h-5 bg-[#f59e0b] rounded-md border-2 border-[#d97706] shadow-lg transform rotate-45"></div>
                <Crown className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500 fill-yellow-500" />
              </div>
              <span className="font-semibold text-slate-700">Your Family Tree</span>
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-indigo-50 transition-colors">
              <div className="w-5 h-5 bg-[#667eea] rounded-md border-2 border-[#8b5cf6] shadow-lg transform rotate-45"></div>
              <span className="text-slate-700">Connected Tree</span>
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-emerald-50 transition-colors">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                <div className="w-8 h-1 bg-gradient-to-r from-emerald-500 to-emerald-300"></div>
                <div className="w-0 h-0 border-l-4 border-l-emerald-500 border-y-4 border-y-transparent"></div>
              </div>
              <span className="text-slate-700">Connection Link</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="space-y-1.5 text-[10px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <Mouse className="w-3 h-3 text-blue-500" />
                <span>Click node to view details</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Hand className="w-3 h-3 text-green-500" />
                <span>Hover to highlight connections</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Search className="w-3 h-3 text-purple-500" />
                <span>Scroll to zoom in/out</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hover Tooltip - Bottom Left with Enhanced Design */}
      {hoverInfo && (
        <div className="absolute bottom-4 left-4 z-50 bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-2xl border-2 border-purple-200 p-4 max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              {hoverInfo.tree.isCurrentTree && <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500 animate-bounce" />}
              <div className="flex-1">
                <div className="font-bold text-sm bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {hoverInfo.tree.isCurrentTree ? 'Your Family Tree' : 'Connected Family Tree'}
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate bg-slate-100 px-2 py-0.5 rounded mt-1">{hoverInfo.tree.familyTreeId}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg px-2 py-1.5 text-center border border-blue-200 hover:shadow-md transition-shadow">
                <div className="font-bold text-blue-600 text-sm">{toNumber(hoverInfo.tree.memberCount)}</div>
                <div className="text-slate-600 font-medium flex items-center justify-center gap-1">
                  <Users className="w-3 h-3" />
                  Members
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg px-2 py-1.5 text-center border border-emerald-200 hover:shadow-md transition-shadow">
                <div className="font-bold text-emerald-600 text-sm">{toNumber(hoverInfo.tree.connectionCount)}</div>
                <div className="text-slate-600 font-medium flex items-center justify-center gap-1">
                  <Link2 className="w-3 h-3" />
                  Links
                </div>
              </div>
            </div>
            
            {hoverInfo.tree.creatorName && (
              <div className="text-[10px] text-slate-600 pt-1 border-t truncate">
                <span className="font-semibold">Creator:</span> {hoverInfo.tree.creatorName}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tree Details Dialog */}
      <Dialog open={selectedTree !== null} onOpenChange={(open) => {
        if (!open) {
          setSelectedTree(null);
          setSelectedTreeData(null);
          setConnectionDetails([]);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedTree?.isCurrentTree && <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
                <span>{selectedTree?.isCurrentTree ? 'Your Family Tree' : 'Connected Family Tree'}</span>
                <Badge variant="outline" className="ml-3">ID: {selectedTree?.familyTreeId}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTree(null)}>
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedTree && (
            <div className="space-y-6">
              {/* Tree Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{toNumber(selectedTree.memberCount)}</div>
                  <div className="text-sm text-slate-600">Members</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{toNumber(selectedTree.connectionCount)}</div>
                  <div className="text-sm text-slate-600">Connections</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <div className="text-lg font-semibold text-amber-600">{selectedTree.creatorName}</div>
                  <div className="text-sm text-slate-600">Creator</div>
                </div>
              </div>

              {/* Connection Details */}
              {connectionDetails.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-emerald-600" />
                    Connection Details
                  </h3>
                  <div className="space-y-2">
                    {connectionDetails.map((conn, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant={conn.sourceFamilyTreeId === currentUser.familyTreeId ? 'default' : 'secondary'}>
                              {conn.sourceUserName}
                            </Badge>
                            <ArrowLeftRight className="w-4 h-4 text-slate-400" />
                            <Badge variant={conn.targetFamilyTreeId === currentUser.familyTreeId ? 'default' : 'secondary'}>
                              {conn.targetUserName}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {conn.relationshipType}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          Connects: <span className="font-mono">{conn.sourceFamilyTreeId}</span> {'->'} <span className="font-mono">{conn.targetFamilyTreeId}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tree Visualization */}
              <div className="border rounded-lg p-4 bg-white">
                <h3 className="font-semibold mb-3">Family Tree Preview</h3>
                <div className="text-sm text-slate-600 mb-2">
                  {selectedTree.isCurrentTree 
                    ? 'Your complete family tree with all members and relationships'
                    : `Connected family tree showing ${toNumber(selectedTree.memberCount)} members`
                  }
                </div>
                {isLoadingTree ? (
                  <div className="h-96 bg-slate-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-slate-600">Loading family tree...</p>
                    </div>
                  </div>
                ) : selectedTreeData && selectedTreeData.members.length > 0 ? (
                  <div className="h-96 rounded-lg overflow-hidden">
                    <FamilyTreeVisualization
                      user={{
                        ...currentUser,
                        familyTreeId: selectedTree.familyTreeId
                      }}
                      familyMembers={selectedTreeData.members}
                      viewMode="all"
                      minHeight="400px"
                      showControls={true}
                      relationships={selectedTreeData.relationships}
                    />
                  </div>
                ) : (
                  <div className="h-96 bg-slate-50 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
                    <div className="text-center">
                      <p className="text-slate-600 mb-2">No members found in this tree</p>
                      <p className="text-xs text-slate-500">Click "View Full Tree" to explore</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => {
                  setSelectedTree(null);
                  setSelectedTreeData(null);
                  setConnectionDetails([]);
                }}>
                  Close
                </Button>
                <Button onClick={() => {
                  // Navigate to full tree view
                  window.location.href = `/family-tree?treeId=${selectedTree.familyTreeId}`;
                }}>
                  View Full Tree
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FamilyTreeMetaGraph;
