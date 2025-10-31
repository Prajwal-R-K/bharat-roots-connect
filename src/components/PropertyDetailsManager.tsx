import * as React from 'react';
import { Home, FileText, Upload, Shield, Eye, EyeOff, Check, X, AlertCircle, Download, Plus, MapPin, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  createPropertyRecord, 
  getPropertyRecords, 
  updatePropertyRecord,
  createVerificationRequest 
} from '@/lib/browser-storage/health-property-storage';
import type { PropertyRecord, PropertyDocument } from '@/lib/mongodb/health-property-types';
import { uploadDocument, validateFile, formatFileSize, getFileIcon } from '@/lib/document-upload';
import { User } from '@/types';

interface PropertyDetailsManagerProps {
  user: User;
  open: boolean;
  onClose: () => void;
}

const PropertyDetailsManager: React.FC<PropertyDetailsManagerProps> = ({ user, open, onClose }) => {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [properties, setProperties] = React.useState<PropertyRecord[]>([]);
  const [selectedProperty, setSelectedProperty] = React.useState<PropertyRecord | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  
  // Form state for new/edit property
  const [formData, setFormData] = React.useState({
    propertyType: 'residential' as 'residential' | 'commercial' | 'agricultural' | 'land' | 'other',
    title: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: ''
    },
    area: {
      value: 0,
      unit: 'sqft' as 'sqft' | 'sqm' | 'acres' | 'hectares'
    },
    purchaseDate: '',
    purchasePrice: 0,
    currentValue: 0,
    ownershipType: 'sole' as 'sole' | 'joint' | 'inherited' | 'trust',
    owners: [] as string[],
    description: '',
    privacySettings: {
      visibility: 'private' as 'public' | 'family' | 'private',
      sharedWith: [] as string[],
      allowVerification: false
    }
  });

  // Load properties
  React.useEffect(() => {
    if (open && user) {
      loadProperties();
    }
  }, [open, user]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const records = await getPropertyRecords(user.userId);
      setProperties(records);
      if (records.length > 0 && !selectedProperty) {
        setSelectedProperty(records[0]);
        populateForm(records[0]);
      }
    } catch (error) {
      console.error('Failed to load properties:', error);
      toast({
        title: 'Error',
        description: 'Failed to load properties. Using localStorage fallback.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (property: PropertyRecord) => {
    setFormData({
      propertyType: property.propertyType,
      title: property.title,
      address: property.address || { street: '', city: '', state: '', country: '', postalCode: '' },
      area: property.area || { value: 0, unit: 'sqft' },
      purchaseDate: property.purchaseDate || '',
      purchasePrice: property.purchasePrice || 0,
      currentValue: property.currentValue || 0,
      ownershipType: property.ownershipType,
      owners: property.owners || [],
      description: property.description || '',
      privacySettings: {
        visibility: property.privacySettings.visibility,
        sharedWith: property.privacySettings.sharedWith || [],
        allowVerification: property.privacySettings.allowVerification
      }
    });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Property title is required',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      if (isCreating || !selectedProperty) {
        // Create new property
        const newProperty = await createPropertyRecord({
          userId: user.userId,
          familyTreeId: user.familyTreeId,
          ...formData,
          documents: [],
          verified: false
        });
        toast({
          title: 'Success',
          description: 'Property added successfully',
        });
        setIsCreating(false);
        await loadProperties();
        setSelectedProperty(newProperty);
      } else {
        // Update existing property
        await updatePropertyRecord(selectedProperty._id!, formData);
        toast({
          title: 'Success',
          description: 'Property updated successfully',
        });
        await loadProperties();
      }
    } catch (error) {
      console.error('Failed to save property:', error);
      toast({
        title: 'Error',
        description: 'Failed to save property. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProperty) return;
    
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const file = files[0];
      
      const validation = validateFile(file);
      if (!validation.valid) {
        toast({
          title: 'Invalid File',
          description: validation.error,
          variant: 'destructive'
        });
        return;
      }

      const uploadedFile = await uploadDocument(file, {
        folder: `property/${selectedProperty._id}`,
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
      });

      const newDocument: PropertyDocument = {
        id: uploadedFile.id,
        name: uploadedFile.name,
        type: 'deed',
        url: uploadedFile.url,
        uploadedAt: uploadedFile.uploadedAt,
        size: uploadedFile.size,
        verified: false
      };

      const updatedDocuments = [...(selectedProperty.documents || []), newDocument];
      await updatePropertyRecord(selectedProperty._id!, { documents: updatedDocuments });
      
      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });
      
      await loadProperties();
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload document',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleRequestVerification = async () => {
    if (!selectedProperty) return;
    
    try {
      await createVerificationRequest({
        requestType: 'property',
        recordId: selectedProperty._id!,
        requestedBy: user.userId,
        requestedFor: user.userId,
        status: 'pending'
      });
      
      toast({
        title: 'Verification Requested',
        description: 'Your property record has been submitted for verification',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to request verification',
        variant: 'destructive'
      });
    }
  };

  const startNewProperty = () => {
    setIsCreating(true);
    setSelectedProperty(null);
    setFormData({
      propertyType: 'residential',
      title: '',
      address: { street: '', city: '', state: '', country: '', postalCode: '' },
      area: { value: 0, unit: 'sqft' },
      purchaseDate: '',
      purchasePrice: 0,
      currentValue: 0,
      ownershipType: 'sole',
      owners: [],
      description: '',
      privacySettings: {
        visibility: 'private',
        sharedWith: [],
        allowVerification: false
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl">Property Details</DialogTitle>
                <DialogDescription>
                  Manage your property portfolio securely
                </DialogDescription>
              </div>
            </div>
            <Button onClick={startNewProperty} size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-600">
              <Plus className="w-4 h-4 mr-1" />
              Add Property
            </Button>
          </div>
        </DialogHeader>

        {loading && !properties.length ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4 mt-4">
            {/* Property List Sidebar */}
            <div className="col-span-1 space-y-2 border-r pr-4">
              <h3 className="font-semibold text-sm text-gray-500 mb-2">Your Properties</h3>
              {properties.length === 0 && !isCreating ? (
                <div className="text-center py-8">
                  <Home className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">No properties yet</p>
                  <Button onClick={startNewProperty} size="sm" variant="outline" className="mt-2">
                    <Plus className="w-4 h-4 mr-1" />
                    Add First Property
                  </Button>
                </div>
              ) : (
                <>
                  {properties.map((property) => (
                    <button
                      key={property._id}
                      onClick={() => {
                        setSelectedProperty(property);
                        setIsCreating(false);
                        populateForm(property);
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedProperty?._id === property._id
                          ? 'bg-emerald-50 border-emerald-300'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-medium text-sm truncate">{property.title}</p>
                      <p className="text-xs text-gray-500">{property.propertyType}</p>
                      {property.verified && (
                        <Badge className="bg-green-500 mt-1 text-xs px-2 py-0.5">
                          <Check className="w-2 h-2 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </button>
                  ))}
                  {isCreating && (
                    <div className="p-3 rounded-lg border border-dashed border-emerald-300 bg-emerald-50">
                      <p className="font-medium text-sm">New Property</p>
                      <p className="text-xs text-gray-500">Unsaved</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Property Details */}
            <div className="col-span-3">
              {(selectedProperty || isCreating) ? (
                <Tabs defaultValue="basic">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="privacy">Privacy</TabsTrigger>
                  </TabsList>

                  {/* Basic Information Tab */}
                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Property Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Title & Type */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="title">Property Title *</Label>
                            <Input
                              id="title"
                              value={formData.title}
                              onChange={(e) => setFormData({...formData, title: e.target.value})}
                              placeholder="My Home / Office Building"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="propertyType">Property Type</Label>
                            <Select 
                              value={formData.propertyType} 
                              onValueChange={(value: any) => setFormData({...formData, propertyType: value})}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="residential">Residential</SelectItem>
                                <SelectItem value="commercial">Commercial</SelectItem>
                                <SelectItem value="agricultural">Agricultural</SelectItem>
                                <SelectItem value="land">Land</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Address */}
                        <div className="border-t pt-4 space-y-3">
                          <h3 className="font-semibold flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Address
                          </h3>
                          <div>
                            <Label htmlFor="street">Street Address</Label>
                            <Input
                              id="street"
                              value={formData.address.street}
                              onChange={(e) => setFormData({
                                ...formData,
                                address: {...formData.address, street: e.target.value}
                              })}
                              placeholder="123 Main Street"
                              className="mt-1"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="city">City</Label>
                              <Input
                                id="city"
                                value={formData.address.city}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  address: {...formData.address, city: e.target.value}
                                })}
                                placeholder="City"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="state">State/Province</Label>
                              <Input
                                id="state"
                                value={formData.address.state}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  address: {...formData.address, state: e.target.value}
                                })}
                                placeholder="State"
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="country">Country</Label>
                              <Input
                                id="country"
                                value={formData.address.country}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  address: {...formData.address, country: e.target.value}
                                })}
                                placeholder="Country"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="postalCode">Postal Code</Label>
                              <Input
                                id="postalCode"
                                value={formData.address.postalCode}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  address: {...formData.address, postalCode: e.target.value}
                                })}
                                placeholder="12345"
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Area & Financial */}
                        <div className="border-t pt-4 space-y-3">
                          <h3 className="font-semibold flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Details & Valuation
                          </h3>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label htmlFor="areaValue">Area</Label>
                              <div className="flex gap-2 mt-1">
                                <Input
                                  id="areaValue"
                                  type="number"
                                  value={formData.area.value}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    area: {...formData.area, value: Number(e.target.value)}
                                  })}
                                  placeholder="0"
                                  className="flex-1"
                                />
                                <Select 
                                  value={formData.area.unit} 
                                  onValueChange={(value: any) => setFormData({
                                    ...formData,
                                    area: {...formData.area, unit: value}
                                  })}
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="sqft">sqft</SelectItem>
                                    <SelectItem value="sqm">sqm</SelectItem>
                                    <SelectItem value="acres">acres</SelectItem>
                                    <SelectItem value="hectares">hectares</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="purchasePrice">Purchase Price</Label>
                              <Input
                                id="purchasePrice"
                                type="number"
                                value={formData.purchasePrice}
                                onChange={(e) => setFormData({...formData, purchasePrice: Number(e.target.value)})}
                                placeholder="0"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="currentValue">Current Value</Label>
                              <Input
                                id="currentValue"
                                type="number"
                                value={formData.currentValue}
                                onChange={(e) => setFormData({...formData, currentValue: Number(e.target.value)})}
                                placeholder="0"
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="purchaseDate">Purchase Date</Label>
                              <Input
                                id="purchaseDate"
                                type="date"
                                value={formData.purchaseDate}
                                onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="ownershipType">Ownership Type</Label>
                              <Select 
                                value={formData.ownershipType} 
                                onValueChange={(value: any) => setFormData({...formData, ownershipType: value})}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="sole">Sole Ownership</SelectItem>
                                  <SelectItem value="joint">Joint Ownership</SelectItem>
                                  <SelectItem value="inherited">Inherited</SelectItem>
                                  <SelectItem value="trust">Trust</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            placeholder="Additional details about the property..."
                            rows={3}
                            className="mt-1"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Documents Tab */}
                  <TabsContent value="documents" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Property Documents</CardTitle>
                          <Label htmlFor="property-file-upload" className="cursor-pointer">
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors">
                              {uploading ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  <span>Upload Document</span>
                                </>
                              )}
                            </div>
                            <input
                              id="property-file-upload"
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={handleFileUpload}
                              disabled={uploading || !selectedProperty}
                            />
                          </Label>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {selectedProperty?.documents && selectedProperty.documents.length > 0 ? (
                          <div className="space-y-2">
                            {selectedProperty.documents.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{getFileIcon(doc.type)}</span>
                                  <div>
                                    <p className="font-medium">{doc.name}</p>
                                    <p className="text-xs text-gray-500">{formatFileSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {doc.verified ? (
                                    <Badge className="bg-green-500">
                                      <Check className="w-3 h-3 mr-1" />
                                      Verified
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">Unverified</Badge>
                                  )}
                                  <Button variant="ghost" size="sm">
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No documents uploaded yet</p>
                            <p className="text-sm">Upload deeds, tax receipts, or property photos</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Privacy Tab */}
                  <TabsContent value="privacy" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Privacy & Verification</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="visibility">Who can see this property?</Label>
                          <Select 
                            value={formData.privacySettings.visibility} 
                            onValueChange={(value: any) => setFormData({
                              ...formData,
                              privacySettings: {...formData.privacySettings, visibility: value}
                            })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="private">
                                <div className="flex items-center gap-2">
                                  <EyeOff className="w-4 h-4" />
                                  <span>Private - Only You</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="family">
                                <div className="flex items-center gap-2">
                                  <Eye className="w-4 h-4" />
                                  <span>Family - All Family Members</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="public">
                                <div className="flex items-center gap-2">
                                  <Eye className="w-4 h-4" />
                                  <span>Public - Everyone</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="border-t pt-4 mt-4">
                          <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-emerald-500 mt-1" />
                            <div className="flex-1">
                              <h3 className="font-semibold mb-1">Verification Status</h3>
                              {selectedProperty?.verified ? (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                  <p className="text-sm text-green-800">
                                    <Check className="w-4 h-4 inline mr-1" />
                                    This property record has been verified
                                  </p>
                                  {selectedProperty.verifiedAt && (
                                    <p className="text-xs text-green-600 mt-1">
                                      Verified on {new Date(selectedProperty.verifiedAt).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <p className="text-sm text-gray-600">
                                    Get your property information verified by family members for added trust
                                  </p>
                                  <Button 
                                    onClick={handleRequestVerification}
                                    variant="outline"
                                    className="w-full"
                                    disabled={!selectedProperty}
                                  >
                                    <Shield className="w-4 h-4 mr-2" />
                                    Request Verification
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mt-4">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-emerald-900">Your data is secure</p>
                              <p className="text-xs text-emerald-700 mt-1">
                                All property information is encrypted and stored securely. Only authorized family members can access shared information based on your privacy settings.
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 py-12">
                  <div className="text-center">
                    <Home className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No property selected</p>
                    <p className="text-sm">Select a property from the list or add a new one</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || (!selectedProperty && !isCreating)} 
            className="bg-gradient-to-r from-emerald-500 to-teal-600"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Property Details
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyDetailsManager;
