import React, { useState, useEffect, useRef } from 'react';
import { FoodItem } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useOrders } from '../../contexts/OrderContext';
import { foodApi } from '../../services/api';
import { UploadCloud, Image as ImageIcon, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface FoodFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  foodItem?: FoodItem | null;
  onSave: (foodData: Omit<FoodItem, 'id' | 'internalStockQty'>) => Promise<void> | void;
}

export const FoodFormModal: React.FC<FoodFormModalProps> = ({
  isOpen,
  onClose,
  foodItem,
  onSave,
}) => {
  const { categories } = useOrders();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(80);
  const [categoryId, setCategoryId] = useState('1');
  const [isAvailable, setIsAvailable] = useState(true);
  const [prepTime, setPrepTime] = useState(10);
  const [isVegetarian, setIsVegetarian] = useState(true);

  // Device file upload state (NO URL input as per strict requirement)
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const realCategories = categories.filter(c => c.id !== 'cat-all');
  const defaultCatId = realCategories[0]?.id || '1';

  useEffect(() => {
    if (foodItem) {
      setName(foodItem.name);
      setDescription(foodItem.description);
      setPrice(foodItem.price);
      setCategoryId(foodItem.categoryId || defaultCatId);
      setIsAvailable(foodItem.isAvailable);
      setPrepTime(foodItem.preparationTimeMinutes);
      setIsVegetarian(foodItem.isVegetarian);
      setImagePreview(foodItem.image);
      setSelectedFile(null);
    } else {
      setName('');
      setDescription('');
      setPrice(80);
      setCategoryId(defaultCatId);
      setIsAvailable(true);
      setPrepTime(10);
      setIsVegetarian(true);
      setImagePreview('');
      setSelectedFile(null);
    }
    setFileError(null);
  }, [foodItem, isOpen, defaultCatId]);

  // Handle local device image selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME types
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFileError('Invalid file format. Please upload JPG, PNG, or WebP images only.');
      return;
    }

    // Validate 5MB max size
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsUploading(true);
      setFileError(null);

      let finalImagePath = foodItem?.image || '';

      // Upload file to backend if new file was chosen from device
      if (selectedFile) {
        const uploadRes = await foodApi.uploadFoodImage(selectedFile);
        finalImagePath = uploadRes.imagePath;
      }

      const categoryObj = realCategories.find(c => c.id === categoryId) || realCategories[0];

      await onSave({
        name: name.trim(),
        description: description.trim(),
        price: Number(price) || 0,
        categoryId,
        categoryName: categoryObj?.name || 'Main Course',
        image: finalImagePath,
        isAvailable, // STRICT: Only Available/Unavailable is controlled here
        preparationTimeMinutes: prepTime,
        isVegetarian,
      });

      onClose();
    } catch (err: any) {
      setFileError(err?.message || 'Failed to upload photo or save dish.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={foodItem ? 'Edit Food Item' : 'Add New Food Item'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Device Image Upload Zone */}
        <div>
          <label className="block text-xs font-semibold text-[#242B26] mb-1">
            Food Photograph <span className="text-red-500">*</span>
          </label>
          <p className="text-[11px] text-[#68716A] mb-2">
            Upload high-resolution photo from your device. Supported: JPG, PNG, WebP (Max 5MB). Image URLs are prohibited.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />

          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-[#E5E7E2] max-h-56 group">
              <img
                src={imagePreview}
                alt="Selected preview"
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="bg-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change Photo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setSelectedFile(null);
                    setImagePreview('');
                  }}
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#244C3A]/30 bg-[#FAF8F3]/60 hover:bg-[#FAF8F3] rounded-2xl p-6 text-center cursor-pointer transition-colors space-y-2"
            >
              <div className="w-12 h-12 rounded-full bg-[#E8F1E9] text-[#244C3A] flex items-center justify-center mx-auto">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-xs font-semibold text-[#242B26]">
                Click to browse photo from this device
              </div>
              <div className="text-[11px] text-[#68716A]">
                JPG, PNG or WebP up to 5MB • Validated by backend magic-bytes
              </div>
            </div>
          )}

          {fileError && (
            <div className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}
        </div>

        {/* Dish Name */}
        <div>
          <label className="block text-xs font-semibold text-[#242B26] mb-1">
            Dish Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Masala Dosa Special"
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
          />
        </div>

        {/* Category & Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#242B26] mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A] bg-white"
            >
              {realCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#242B26] mb-1">
              Price (INR ₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min={1}
              step="any"
              value={price}
              onChange={e => setPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
            />
          </div>
        </div>

        {/* Prep Time & Diet */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#242B26] mb-1">
              Prep Time (Minutes)
            </label>
            <input
              type="number"
              min={1}
              value={prepTime}
              onChange={e => setPrepTime(parseInt(e.target.value, 10) || 10)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#242B26] mb-1">
              Dietary Category
            </label>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="diet"
                  checked={isVegetarian}
                  onChange={() => setIsVegetarian(true)}
                  className="text-[#244C3A]"
                />
                <span className="font-semibold text-emerald-800">100% Pure Veg</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="diet"
                  checked={!isVegetarian}
                  onChange={() => setIsVegetarian(false)}
                  className="text-red-600"
                />
                <span className="font-semibold text-amber-900">Non-Veg</span>
              </label>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-[#242B26] mb-1">
            Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Short details about the dish ingredients & accompaniments..."
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E5E7E2] focus:outline-none focus:ring-2 focus:ring-[#244C3A]"
          />
        </div>

        {/* STRICT AVAILABILITY CONTROL ONLY — NO STOCK COUNTERS */}
        <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E5E7E2] space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#242B26] block">
                Food Court Availability State
              </span>
              <span className="text-[11px] text-[#68716A]">
                Controls whether this dish appears active on customer digital kiosks & menu.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsAvailable(!isAvailable)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#244C3A] ${
                isAvailable ? 'bg-[#244C3A]' : 'bg-stone-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isAvailable ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="text-[11px] font-semibold flex items-center gap-1 pt-1 border-t border-[#E5E7E2]">
            <span>Current Status:</span>
            {isAvailable ? (
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Available to Order
              </span>
            ) : (
              <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded">
                Unavailable (Sold Out)
              </span>
            )}
          </div>

          <p className="text-[10px] text-stone-500 italic">
            🛡️ Strict Policy: Internal stock quantity is maintained internally by backend transactions and is never displayed.
          </p>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7E2]">
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isUploading}
            icon={isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          >
            {isUploading ? 'Uploading & Saving...' : foodItem ? 'Save Changes' : 'Create Food Item'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
