import * as React from 'react';
import { Activity, FileText, Upload, Shield, Eye, EyeOff, Check, X, AlertCircle, Download, Trash2, Plus } from 'lucide-react';
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
  createHealthRecord, 
  getHealthRecord, 
  updateHealthRecord,
  createVerificationRequest 
} from '@/lib/browser-storage/health-property-storage';
import type { HealthRecord, HealthDocument } from '@/lib/mongodb/health-property-types';
import { uploadDocument, validateFile, formatFileSize, getFileIcon } from '@/lib/document-upload';
import { User } from '@/types';

interface HealthDetailsManagerProps {
  user: User;
  open: boolean;
  onClose: () => void;
}

const HealthDetailsManager: React.FC<HealthDetailsManagerProps> = ({ user, open, onClose }) => {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [healthRecord, setHealthRecord] = React.useState<HealthRecord | null>(null);
  const [uploading, setUploading] = React.useState(false);
  
  // Form state
  const [formData, setFormData] = React.useState({
    bloodGroup: '',
    allergies: [] as string[],
    chronicConditions: [] as string[],
    medications: [] as string[],
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    },
    medicalHistory: '',
    insuranceInfo: {
      provider: '',
      policyNumber: '',
      expiryDate: ''
    },
    privacySettings: {
      visibility: 'private' as 'public' | 'family' | 'private',
      sharedWith: [] as string[],
      allowVerification: false
    }
  });
  
  // Temporary input fields
  const [allergyInput, setAllergyInput] = React.useState('');
  const [conditionInput, setConditionInput] = React.useState('');
  const [medicationInput, setMedicationInput] = React.useState('');

  // Load existing health record
  React.useEffect(() => {
    if (open && user) {
      loadHealthRecord();
    }
  }, [open, user]);

  const loadHealthRecord = async () => {
    setLoading(true);
    try {
      const record = await getHealthRecord(user.userId);
      if (record) {
        setHealthRecord(record);
        setFormData({
          bloodGroup: record.bloodGroup || '',
          allergies: record.allergies || [],
          chronicConditions: record.chronicConditions || [],
          medications: record.medications || [],
          emergencyContact: record.emergencyContact || { name: '', relationship: '', phone: '' },
          medicalHistory: record.medicalHistory || '',
          insuranceInfo: record.insuranceInfo || { provider: '', policyNumber: '', expiryDate: '' },
          privacySettings: {
            visibility: record.privacySettings.visibility,
            sharedWith: record.privacySettings.sharedWith || [],
            allowVerification: record.privacySettings.allowVerification
          }
        });
      }
    } catch (error) {
      console.error('Failed to load health record:', error);
      toast({
        title: 'Error',
        description: 'Failed to load health record. Using localStorage fallback.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (healthRecord) {
        // Update existing record
        await updateHealthRecord(user.userId, formData);
        toast({
          title: 'Success',
          description: 'Health details updated successfully',
        });
      } else {
        // Create new record
        const newRecord = await createHealthRecord({
          userId: user.userId,
          familyTreeId: user.familyTreeId,
          ...formData,
          documents: [],
          verified: false,
        });
        setHealthRecord(newRecord);
        toast({
          title: 'Success',
          description: 'Health details created successfully',
        });
      }
      await loadHealthRecord(); // Reload to get updated data
    } catch (error) {
      console.error('Failed to save health record:', error);
      toast({
        title: 'Error',
        description: 'Failed to save health record. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const file = files[0];
      
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        toast({
          title: 'Invalid File',
          description: validation.error,
          variant: 'destructive'
        });
        return;
      }

      // Upload document
      const uploadedFile = await uploadDocument(file, {
        folder: `health/${user.userId}`,
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
      });

      // Add to health record documents
      const newDocument: HealthDocument = {
        id: uploadedFile.id,
        name: uploadedFile.name,
        type: 'medical-report',
        url: uploadedFile.url,
        uploadedAt: uploadedFile.uploadedAt,
        size: uploadedFile.size,
        verified: false
      };

      const updatedDocuments = [...(healthRecord?.documents || []), newDocument];
      await updateHealthRecord(user.userId, { documents: updatedDocuments });
      
      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });
      
      await loadHealthRecord();
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload document',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleRequestVerification = async () => {
    if (!healthRecord) return;
    
    try {
      await createVerificationRequest({
        requestType: 'health',
        recordId: healthRecord._id!,
        requestedBy: user.userId,
        requestedFor: user.userId,
        status: 'pending'
      });
      
      toast({
        title: 'Verification Requested',
        description: 'Your health record has been submitted for verification',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to request verification',
        variant: 'destructive'
      });
    }
  };

  const addArrayItem = (field: 'allergies' | 'chronicConditions' | 'medications', value: string) => {
    if (!value.trim()) return;
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], value.trim()]
    }));
    // Clear input
    if (field === 'allergies') setAllergyInput('');
    if (field === 'chronicConditions') setConditionInput('');
    if (field === 'medications') setMedicationInput('');
  };

  const removeArrayItem = (field: 'allergies' | 'chronicConditions' | 'medications', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl">Health Details</DialogTitle>
                <DialogDescription>
                  Manage your health information securely
                </DialogDescription>
              </div>
            </div>
            {healthRecord?.verified && (
              <Badge className="bg-green-500">
                <Check className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Health Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Blood Group */}
                  <div>
                    <Label htmlFor="bloodGroup">Blood Group</Label>
                    <Select 
                      value={formData.bloodGroup} 
                      onValueChange={(value) => setFormData({...formData, bloodGroup: value})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Allergies */}
                  <div>
                    <Label>Allergies</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={allergyInput}
                        onChange={(e) => setAllergyInput(e.target.value)}
                        placeholder="Enter allergy"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addArrayItem('allergies', allergyInput);
                          }
                        }}
                      />
                      <Button onClick={() => addArrayItem('allergies', allergyInput)} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.allergies.map((allergy, index) => (
                        <Badge key={index} variant="secondary" className="gap-1">
                          {allergy}
                          <X 
                            className="w-3 h-3 cursor-pointer" 
                            onClick={() => removeArrayItem('allergies', index)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-semibold mb-3">Emergency Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="emergencyName">Name</Label>
                        <Input
                          id="emergencyName"
                          value={formData.emergencyContact.name}
                          onChange={(e) => setFormData({
                            ...formData,
                            emergencyContact: { ...formData.emergencyContact, name: e.target.value }
                          })}
                          placeholder="Full name"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergencyRelationship">Relationship</Label>
                        <Input
                          id="emergencyRelationship"
                          value={formData.emergencyContact.relationship}
                          onChange={(e) => setFormData({
                            ...formData,
                            emergencyContact: { ...formData.emergencyContact, relationship: e.target.value }
                          })}
                          placeholder="e.g., Spouse, Parent"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergencyPhone">Phone</Label>
                        <Input
                          id="emergencyPhone"
                          value={formData.emergencyContact.phone}
                          onChange={(e) => setFormData({
                            ...formData,
                            emergencyContact: { ...formData.emergencyContact, phone: e.target.value }
                          })}
                          placeholder="+1 234 567 8900"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Medical History Tab */}
            <TabsContent value="medical" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Medical History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Chronic Conditions */}
                  <div>
                    <Label>Chronic Conditions</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={conditionInput}
                        onChange={(e) => setConditionInput(e.target.value)}
                        placeholder="Enter condition"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addArrayItem('chronicConditions', conditionInput);
                          }
                        }}
                      />
                      <Button onClick={() => addArrayItem('chronicConditions', conditionInput)} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.chronicConditions.map((condition, index) => (
                        <Badge key={index} variant="secondary" className="gap-1">
                          {condition}
                          <X 
                            className="w-3 h-3 cursor-pointer" 
                            onClick={() => removeArrayItem('chronicConditions', index)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Medications */}
                  <div>
                    <Label>Current Medications</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={medicationInput}
                        onChange={(e) => setMedicationInput(e.target.value)}
                        placeholder="Enter medication"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addArrayItem('medications', medicationInput);
                          }
                        }}
                      />
                      <Button onClick={() => addArrayItem('medications', medicationInput)} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.medications.map((medication, index) => (
                        <Badge key={index} variant="secondary" className="gap-1">
                          {medication}
                          <X 
                            className="w-3 h-3 cursor-pointer" 
                            onClick={() => removeArrayItem('medications', index)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Medical History Notes */}
                  <div>
                    <Label htmlFor="medicalHistory">Additional Medical History</Label>
                    <Textarea
                      id="medicalHistory"
                      value={formData.medicalHistory}
                      onChange={(e) => setFormData({...formData, medicalHistory: e.target.value})}
                      placeholder="Enter any additional medical history, surgeries, or important notes..."
                      rows={5}
                      className="mt-1"
                    />
                  </div>

                  {/* Insurance Information */}
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-semibold mb-3">Insurance Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="insuranceProvider">Provider</Label>
                        <Input
                          id="insuranceProvider"
                          value={formData.insuranceInfo.provider}
                          onChange={(e) => setFormData({
                            ...formData,
                            insuranceInfo: { ...formData.insuranceInfo, provider: e.target.value }
                          })}
                          placeholder="Insurance company"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="policyNumber">Policy Number</Label>
                        <Input
                          id="policyNumber"
                          value={formData.insuranceInfo.policyNumber}
                          onChange={(e) => setFormData({
                            ...formData,
                            insuranceInfo: { ...formData.insuranceInfo, policyNumber: e.target.value }
                          })}
                          placeholder="Policy #"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input
                          id="expiryDate"
                          type="date"
                          value={formData.insuranceInfo.expiryDate}
                          onChange={(e) => setFormData({
                            ...formData,
                            insuranceInfo: { ...formData.insuranceInfo, expiryDate: e.target.value }
                          })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Medical Documents</CardTitle>
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
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
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                    </Label>
                  </div>
                </CardHeader>
                <CardContent>
                  {healthRecord?.documents && healthRecord.documents.length > 0 ? (
                    <div className="space-y-2">
                      {healthRecord.documents.map((doc) => (
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
                      <p className="text-sm">Upload medical reports, prescriptions, or insurance documents</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy & Verification Tab */}
            <TabsContent value="privacy" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Privacy & Verification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Privacy Settings */}
                  <div>
                    <Label htmlFor="visibility">Who can see this information?</Label>
                    <Select 
                      value={formData.privacySettings.visibility} 
                      onValueChange={(value: any) => setFormData({
                        ...formData,
                        privacySettings: { ...formData.privacySettings, visibility: value }
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

                  {/* Verification */}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-blue-500 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">Verification Status</h3>
                        {healthRecord?.verified ? (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-sm text-green-800">
                              <Check className="w-4 h-4 inline mr-1" />
                              This health record has been verified
                            </p>
                            {healthRecord.verifiedAt && (
                              <p className="text-xs text-green-600 mt-1">
                                Verified on {new Date(healthRecord.verifiedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                              Get your health information verified by family members for added trust
                            </p>
                            <Button 
                              onClick={handleRequestVerification}
                              variant="outline"
                              className="w-full"
                              disabled={!healthRecord}
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              Request Verification
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Your data is secure</p>
                        <p className="text-xs text-blue-700 mt-1">
                          All health information is encrypted and stored securely. Only authorized family members can access shared information based on your privacy settings.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-gradient-to-r from-red-500 to-pink-600">
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Health Details
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HealthDetailsManager;
