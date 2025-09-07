
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { ImageUpload } from './components/ImageUpload';
import { Loader } from './components/Loader';
import { MagicWandIcon } from './components/icons/MagicWandIcon';
import { editImageWithGemini } from './services/geminiService';
import type { EditImageResult } from './types';
import { AlertTriangleIcon } from './components/icons/AlertTriangleIcon';
import { LightbulbIcon } from './components/icons/LightbulbIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { ExampleGallery } from './components/ExampleGallery';
import { PromptHistory } from './components/PromptHistory';
import { AdModal } from './components/AdModal';

const examplePrompts = [
  "Add a pair of cool sunglasses to the subject.",
  "Change the background to a beautiful beach at sunset.",
  "Make the cat wear a tiny wizard hat.",
  "Turn the photo into a black and white vintage-style image.",
  "Add a subtle flying saucer in the sky.",
  "Make it look like it's snowing lightly.",
  "Add a reflection of a futuristic cityscape in the person's glasses.",
  "Give the dog a superhero cape.",
  "Change the color of the car to a vibrant cherry red.",
  "Surround the main subject with glowing, magical butterflies.",
  "Place a steaming cup of coffee on the table.",
  "Make the sky look like a van Gogh painting."
];


function App() {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [editedResult, setEditedResult] = useState<EditImageResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [imageToDownload, setImageToDownload] = useState<string | null>(null);


  const handleImageUpload = useCallback((file: File) => {
    setOriginalImage(file);
    setOriginalImagePreview(URL.createObjectURL(file));
    setEditedResult(null);
    setError(null);
    setPrompt('');
  }, []);
  
  const handleExampleSelect = async (imageUrl: string, examplePrompt: string) => {
    try {
      setError(null);
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Network response was not ok. Status: ${response.status}`);
      }
      const blob = await response.blob();
      const filename = imageUrl.split('/').pop() || 'example.jpg';
      const file = new File([blob], filename, { type: blob.type });

      handleImageUpload(file);
      setPrompt(examplePrompt);

    } catch (err) {
      console.error("Failed to load example image:", err);
      setError("Sorry, we couldn't load that example. Please try another or upload your own image.");
    }
  };


  const resetState = useCallback(() => {
    setOriginalImage(null);
    setOriginalImagePreview(null);
    setEditedResult(null);
    setError(null);
    setPrompt('');
    setPromptHistory([]);
    setIsLoading(false);
  }, []);

  const convertFileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const mimeType = result.substring(5, result.indexOf(';'));
        const base64 = result.split(',')[1];
        resolve({ base64, mimeType });
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!originalImage || !trimmedPrompt) {
      setError("Please provide an image and a descriptive prompt.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setEditedResult(null);

    // Add prompt to history
    setPromptHistory(prevHistory => {
        const filteredHistory = prevHistory.filter(p => p !== trimmedPrompt);
        const newHistory = [trimmedPrompt, ...filteredHistory].slice(0, 5); // Keep last 5 unique prompts
        return newHistory;
    });

    try {
      const { base64, mimeType } = await convertFileToBase64(originalImage);
      const result = await editImageWithGemini(base64, mimeType, prompt);
      setEditedResult(result);
    } catch (err) {
      console.error("Image editing failed:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExamplePrompt = () => {
    const randomIndex = Math.floor(Math.random() * examplePrompts.length);
    setPrompt(examplePrompts[randomIndex]);
  };
  
  const handleSelectPromptFromHistory = (selectedPrompt: string) => {
    setPrompt(selectedPrompt);
  };

  const handleDownloadRequest = (imageUrl: string) => {
    if (!imageUrl) return;
    setImageToDownload(imageUrl);
    setIsAdModalOpen(true);
  };

  const startDownload = () => {
    if (!imageToDownload) return;
    
    const link = document.createElement('a');
    link.href = imageToDownload;

    const mimeType = imageToDownload.substring(imageToDownload.indexOf(':') + 1, imageToDownload.indexOf(';'));
    const extension = mimeType.split('/')[1] || 'png';
    link.download = `edited-image-by-banana-ai.${extension}`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setImageToDownload(null);
  };

  const handleAdModalClose = () => {
    setIsAdModalOpen(false);
    startDownload();
  };


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <Header onReset={resetState} hasImage={!!originalImagePreview} />
      <main className="w-full max-w-6xl flex flex-col items-center flex-grow">
        {!originalImagePreview ? (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <ExampleGallery onExampleSelect={handleExampleSelect} />
            <div className="relative my-8 w-full max-w-2xl text-center">
              <hr className="border-t border-gray-700"/>
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 px-4 text-gray-500 font-semibold">OR</span>
            </div>
            <ImageUpload onImageUpload={handleImageUpload} />
             {error && (
              <div className="mt-6 w-full max-w-2xl bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg flex items-center">
                <AlertTriangleIcon className="w-6 h-6 mr-3 text-red-400"/>
                <span className="font-medium">{error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <form onSubmit={handleSubmit} className="w-full max-w-3xl mb-8">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., 'Add a birthday hat on the cat' or 'Make the sky look like a vibrant sunset'"
                  className="w-full p-4 pr-32 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-200 resize-none"
                  rows={3}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !prompt.trim()}
                  className="absolute top-1/2 right-3 -translate-y-1/2 flex items-center justify-center px-4 py-2 bg-yellow-500 text-gray-900 font-bold rounded-md hover:bg-yellow-400 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:scale-100"
                >
                  <MagicWandIcon className="w-5 h-5 mr-2" />
                  <span>{isLoading ? 'Editing...' : 'Edit'}</span>
                </button>
              </div>
               <div className="w-full text-right mt-2">
                  <button 
                    type="button" 
                    onClick={handleExamplePrompt}
                    className="flex items-center justify-end ml-auto text-sm text-gray-400 hover:text-yellow-400 transition-colors disabled:opacity-50"
                    disabled={isLoading}
                    title="Get a random prompt idea"
                  >
                      <LightbulbIcon className="w-4 h-4 mr-1.5" />
                      <span>Try an example</span>
                  </button>
              </div>
              <PromptHistory 
                prompts={promptHistory} 
                onSelectPrompt={handleSelectPromptFromHistory} 
                disabled={isLoading}
              />
            </form>
            
            {error && !isLoading && (
              <div className="w-full max-w-3xl bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6 flex items-center animate-fade-in">
                <AlertTriangleIcon className="w-6 h-6 mr-3 text-red-400"/>
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
              <ImageContainer title="Original" imageUrl={originalImagePreview} />
              <ImageContainer 
                title="Edited" 
                imageUrl={editedResult?.imageUrl} 
                isLoading={isLoading} 
                textOutput={editedResult?.text}
                onDownload={handleDownloadRequest}
              />
            </div>
          </div>
        )}
      </main>
      <footer className="w-full max-w-6xl mt-auto pt-8">
      </footer>
      {isAdModalOpen && <AdModal onClose={handleAdModalClose} />}
    </div>
  );
}

interface ImageContainerProps {
  title: string;
  imageUrl?: string | null;
  isLoading?: boolean;
  textOutput?: string | null;
  onDownload?: (imageUrl: string) => void;
}

const ImageContainer: React.FC<ImageContainerProps> = ({ title, imageUrl, isLoading = false, textOutput, onDownload }) => {
  const isEditedPanel = title === 'Edited';

  return (
    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 flex flex-col">
       <div className="flex justify-center items-center mb-4 relative h-8">
          <h2 className="text-xl font-bold text-yellow-400">{title}</h2>
          {isEditedPanel && imageUrl && !isLoading && onDownload && (
            <button
              onClick={() => onDownload(imageUrl!)}
              className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center px-3 py-1.5 bg-gray-700 text-gray-200 font-semibold rounded-lg hover:bg-gray-600 transition-colors duration-200"
              title="Download Edited Image"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              <span>Download</span>
            </button>
          )}
        </div>
      <div className="aspect-square w-full bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
        {isLoading && isEditedPanel ? (
          <Loader />
        ) : imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-contain" />
        ) : (
          <div className="text-gray-500">Your edited image will appear here</div>
        )}
      </div>
       {textOutput && !isLoading && (
          <div className="mt-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
            <p className="text-sm text-gray-300 italic">{textOutput}</p>
          </div>
        )}
    </div>
  );
};


export default App;