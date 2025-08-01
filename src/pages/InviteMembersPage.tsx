import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Mail, MessageSquare, Copy, Share2, ExternalLink, QrCode } from 'lucide-react';

const InviteMembersPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<UserType | null>(null);
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      navigate('/auth');
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  const appUrl = window.location.origin;
  const inviteUrl = `${appUrl}/auth?ref=${user?.familyTreeId}`;

  const defaultMessage = `Hi! I'd like to invite you to join our family tree on Family Tree Builder. 

You can create your account and connect with our family at: ${inviteUrl}

This app helps us visualize our family connections and share memories together.

Best regards,
${user?.name}`;

  const getMessage = () => customMessage || defaultMessage;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: "Text copied to clipboard",
      });
    });
  };

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(getMessage());
    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Join our Family Tree - Invitation from ${user?.name}`);
    const body = encodeURIComponent(getMessage());
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
  };

  const shareViaSMS = () => {
    const message = encodeURIComponent(getMessage());
    const smsUrl = `sms:?body=${message}`;
    window.location.href = smsUrl;
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join our Family Tree',
          text: getMessage(),
          url: inviteUrl,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      copyToClipboard(getMessage());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-purple-800 flex items-center gap-3">
            <Mail className="w-8 h-8" />
            Invite Family Members
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invitation Link */}
          <Card className="shadow-xl border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                Invitation Link
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="invite-url">Share this link with family members:</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="invite-url"
                    value={inviteUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(inviteUrl)}
                    className="flex items-center gap-1"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-800 mb-2">How it works:</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Family members click the link to visit the app</li>
                  <li>• They create an account using their email</li>
                  <li>• They can then request to join your family tree</li>
                  <li>• You can approve their connection and set relationships</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Custom Message */}
          <Card className="shadow-xl border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Custom Message
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="custom-message">Personalize your invitation message:</Label>
                <Textarea
                  id="custom-message"
                  placeholder={defaultMessage}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={8}
                  className="mt-2 resize-none"
                />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCustomMessage('')}
                className="w-full"
              >
                Reset to Default Message
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sharing Options */}
        <Card className="shadow-xl border-0 bg-white">
          <CardHeader>
            <CardTitle className="text-xl text-purple-800 flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Share Invitation
            </CardTitle>
            <p className="text-purple-600 text-sm">Choose how you want to share the invitation</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* WhatsApp */}
              <Button 
                onClick={shareViaWhatsApp}
                className="bg-green-500 hover:bg-green-600 text-white h-20 flex flex-col items-center gap-2"
              >
                <MessageSquare className="w-6 h-6" />
                <span className="text-sm">WhatsApp</span>
              </Button>

              {/* Email */}
              <Button 
                onClick={shareViaEmail}
                className="bg-blue-500 hover:bg-blue-600 text-white h-20 flex flex-col items-center gap-2"
              >
                <Mail className="w-6 h-6" />
                <span className="text-sm">Email</span>
              </Button>

              {/* SMS */}
              <Button 
                onClick={shareViaSMS}
                className="bg-indigo-500 hover:bg-indigo-600 text-white h-20 flex flex-col items-center gap-2"
              >
                <MessageSquare className="w-6 h-6" />
                <span className="text-sm">SMS</span>
              </Button>

              {/* Native Share / Copy */}
              <Button 
                onClick={shareNative}
                className="bg-purple-500 hover:bg-purple-600 text-white h-20 flex flex-col items-center gap-2"
              >
                <Share2 className="w-6 h-6" />
                <span className="text-sm">
                  {navigator.share ? 'Share' : 'Copy All'}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Message Preview */}
        <Card className="shadow-xl border-0 bg-gray-50">
          <CardHeader>
            <CardTitle className="text-lg text-gray-800">Message Preview</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                {getMessage()}
              </pre>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => copyToClipboard(getMessage())}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Message
            </Button>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
              <div className="text-sm text-purple-700">
                <p className="font-medium mb-1">Invitation Tips:</p>
                <ul className="space-y-1 text-purple-600">
                  <li>• Share the invitation link through multiple channels for better reach</li>
                  <li>• Personalize your message to explain the benefits of joining</li>
                  <li>• Follow up with family members who haven't joined yet</li>
                  <li>• Help older family members with the registration process if needed</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InviteMembersPage;