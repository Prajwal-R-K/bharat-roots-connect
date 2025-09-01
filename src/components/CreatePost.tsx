import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Image as ImageIcon, Send, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { createFamilyPost, FamilyPost } from '@/lib/posts-api';
import { toast } from '@/hooks/use-toast';

interface CreatePostProps {
  familyId: string;
  userId: string;
  userName: string;
  onPostCreated?: (post: FamilyPost) => void;
}

export const CreatePost: React.FC<CreatePostProps> = ({
  familyId,
  userId,
  userName,
  onPostCreated
}) => {
  const [description, setDescription] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  // Two-step flow: 1) select images, 2) add description & post
  const [step, setStep] = useState<'select' | 'describe'>('select');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-trigger file selection when component mounts (dialog opens)
  useEffect(() => {
    if (step === 'select' && selectedImages.length === 0) {
      // Small delay to ensure dialog is fully rendered
      const timer = setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step, selectedImages.length]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 10 images
    const newImages = [...selectedImages, ...files].slice(0, 10);
    setSelectedImages(newImages);

    // Create previews
    const newPreviews = [...imagePreviews];
    files.forEach((file) => {
      if (newPreviews.length < 10) {
        newPreviews.push(URL.createObjectURL(file));
      }
    });
    setImagePreviews(newPreviews);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    
    // Revoke URL to prevent memory leaks
    URL.revokeObjectURL(imagePreviews[index]);
    
    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Require at least one image first (image-first flow)
    if (selectedImages.length === 0) {
      toast({
        title: "Add photos",
        description: "Please select at least one image to continue.",
        variant: "destructive"
      });
      setStep('select');
      return;
    }

    if (!description.trim() && selectedImages.length === 0) {
      toast({
        title: "Empty Post",
        description: "Please add some content or images to your post.",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const newPost = await createFamilyPost({
        familyId,
        userId,
        userName,
        description: description.trim(),
        images: selectedImages
      });

      onPostCreated?.(newPost);
      
      // Reset form
      setDescription('');
      setSelectedImages([]);
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
      setImagePreviews([]);
      setStep('select');

      toast({
        title: "Post Created!",
        description: "Your post has been shared with your family.",
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setDescription('');
    setSelectedImages([]);
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImagePreviews([]);
    setStep('select');
  };
  return (
    <div className="w-full h-full">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{userName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sharing with family</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="p-2"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-4 py-4">
          {/* Step indicator */}
          <div className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-300 mb-4">
            <div className={`flex items-center ${step === 'select' ? 'font-semibold text-blue-600' : ''}`}>
              1. Select Photos
            </div>
            <ChevronRight className="mx-2 h-4 w-4" />
            <div className={`${step === 'describe' ? 'font-semibold text-blue-600' : ''}`}>2. Add Description</div>
          </div>

          {/* Step 1: Select Images */}
          {step === 'select' && (
            <div>
              {/* Previews */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 sm:h-36 md:h-40 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Drop / Upload */}
              {selectedImages.length < 10 && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-2 border-dashed border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-700 py-8 flex flex-col items-center"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="h-6 w-6 mb-2 text-gray-600 dark:text-gray-300" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Add Photos ({selectedImages.length}/10)</span>
                  </Button>
                </div>
              )}

              <div className="flex justify-end mt-4">
                <Button
                  type="button"
                  disabled={selectedImages.length === 0}
                  onClick={() => setStep('describe')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Description */}
          {step === 'describe' && (
            <div>
              {/* Preview row */}
              {imagePreviews.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                  {imagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative flex-shrink-0">
                      <img src={preview} alt={`Preview ${idx + 1}`} className="h-20 w-20 object-cover rounded-md" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
                        onClick={() => removeImage(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`Say something about your photos, ${userName.split(' ')[0]}...`}
                className="min-h-[160px] border-none resize-none focus:ring-2 focus:ring-blue-500 p-0 text-lg placeholder-gray-500 dark:placeholder-gray-400 bg-transparent"
                maxLength={2000}
              />

              {selectedImages.length < 10 && (
                <div className="mt-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-2 border-dashed border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add More Photos ({selectedImages.length}/10)
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {description.length}/2000 characters
          </div>
          <div className="flex space-x-2">
            {step === 'describe' && (
              <Button type="button" variant="ghost" onClick={() => setStep('select')} disabled={isCreating}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || selectedImages.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCreating ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Posting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Send className="h-4 w-4" />
                  <span>Post</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
