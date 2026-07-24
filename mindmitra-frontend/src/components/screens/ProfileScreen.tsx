import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Loader2,
  Mail,
  Phone,
  Save,
  Sun,
  Moon,
  Settings,
  User as UserIcon,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';
import type { EmergencyContact } from '../../api/auth';
import {
  updateProfile,
  uploadProfilePicture,
} from '../../api/auth';

const EMPTY_CONTACT: EmergencyContact = {
  name: '',
  phone: '',
  email: '',
  relationship: '',
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function axiosErrorMessage(err: unknown): string | null {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { detail?: string } } }).response;
    if (typeof response?.data?.detail === 'string') {
      return response.data.detail;
    }
  }
  return null;
}

interface ProfileScreenProps {
  onLogoutComplete?: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogoutComplete }) => {
  const { darkMode, setDarkMode, user, token, setUser, refreshUser, logout, loadingUser } =
    useAppContext();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState<EmergencyContact>(EMPTY_CONTACT);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [pendingPicture, setPendingPicture] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      const existing = user.emergency_contacts?.[0];
      setContact(existing ? { ...existing, email: existing.email || '' } : { ...EMPTY_CONTACT });
      setPicturePreview(user.profile_picture_url || null);
    }
  }, [user]);

  const resetForm = () => {
    if (!user) return;
    setName(user.name);
    const existing = user.emergency_contacts?.[0];
    setContact(existing ? { ...existing, email: existing.email || '' } : { ...EMPTY_CONTACT });
    setPicturePreview(user.profile_picture_url || null);
    setPendingPicture(null);
    setError('');
    setSuccess('');
  };

  const handlePictureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      const errMsg = 'Please choose a JPEG, PNG, WebP, or GIF image.';
      setError(errMsg);
      toast.error(errMsg);
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      const errMsg = 'Image must be smaller than 5MB.';
      setError(errMsg);
      toast.error(errMsg);
      return;
    }

    setPendingPicture(file);
    setPicturePreview(URL.createObjectURL(file));
    setError('');
  };

  const validateContact = (): string | null => {
    const hasAny = contact.name || contact.phone || contact.relationship || contact.email;
    if (!hasAny) return null;

    if (!contact.name.trim()) return 'Emergency contact name is required.';
    if (!contact.phone.trim() || contact.phone.trim().length < 10) {
      return 'Emergency contact phone must be at least 10 digits.';
    }
    if (!contact.relationship.trim()) return 'Relationship is required.';
    return null;
  };

  const handleSave = async () => {
    if (!token || !user) return;

    const contactError = validateContact();
    if (contactError) {
      setError(contactError);
      toast.error(contactError);
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let updatedUser = user;

      if (pendingPicture) {
        const pictureRes = await uploadProfilePicture(pendingPicture, token);
        updatedUser = pictureRes.data;
        setUser(updatedUser);
        setPendingPicture(null);
      }

      const hasContact =
        contact.name.trim() && contact.phone.trim() && contact.relationship.trim();

      const profileRes = await updateProfile(
        {
          name: name.trim(),
          emergency_contacts: hasContact
            ? [
                {
                  name: contact.name.trim(),
                  phone: contact.phone.trim(),
                  email: contact.email?.trim() || undefined,
                  relationship: contact.relationship.trim(),
                },
              ]
            : [],
        },
        token
      );

      setUser(profileRes.data);
      setPicturePreview(profileRes.data.profile_picture_url || null);
      setIsEditing(false);
      const successMsg = 'Profile saved successfully.';
      setSuccess(successMsg);
      toast.success(successMsg);
      await refreshUser();
    } catch (err: unknown) {
      const message =
        axiosErrorMessage(err) || 'Failed to save profile. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    onLogoutComplete?.();
  };

  const cardClass = "app-card";
  const inputClass = "w-full p-4 rounded-2xl border border-theme-border focus:ring-2 focus:ring-theme-blue focus:border-transparent transition-all duration-200 bg-theme-surface text-theme-text-primary placeholder-gray-400";

  if (loadingUser && !user) {
    return (
      <div className={`min-h-screen bg-theme-bg flex items-center justify-center`}>
        <Loader2 className="w-8 h-8 animate-spin text-theme-orange" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-theme-bg text-theme-text-primary p-6 pb-24`}>
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-theme-surface border border-theme-border rounded-full shadow-sm text-[10px] font-extrabold uppercase tracking-wider text-theme-orange mb-3">
            👤 Account Settings
          </span>
          <h2 className="text-3xl font-extrabold text-theme-blue dark:text-white tracking-tight leading-tight">Profile Settings</h2>
        </div>

        <div className={`${cardClass} p-8 text-center`}>
          <div className="relative w-24 h-24 mx-auto mb-5">
            {picturePreview ? (
              <img
                src={picturePreview}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-theme-orange"
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-theme-blue to-theme-orange rounded-full flex items-center justify-center text-white text-3xl font-extrabold shadow-md">
                {user?.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            {isEditing && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-theme-orange hover:bg-theme-orange-hover text-white p-2.5 rounded-full shadow-md transition-all duration-200"
                aria-label="Change profile picture"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handlePictureSelect}
            />
          </div>

          {isEditing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${inputClass} text-center font-bold text-lg mb-3`}
              placeholder="Your name"
              maxLength={100}
            />
          ) : (
            <h3 className="text-2xl font-extrabold mb-1.5 tracking-tight text-theme-blue dark:text-white">{user?.name || 'Guest'}</h3>
          )}

          <p className="text-sm font-medium text-theme-text-secondary">
            {user?.email || 'Not signed in'}
          </p>
        </div>

        <div className={`${cardClass} p-6 md:p-8`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h4 className="font-bold text-theme-blue dark:text-white">Emergency Contact</h4>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsEditing(true);
                }}
                className="text-sm text-theme-orange hover:text-theme-orange-hover font-bold transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-theme-text-secondary mb-2 block">Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-4.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={contact.name}
                    onChange={(e) => setContact({ ...contact, name: e.target.value })}
                    className={`${inputClass} pl-12`}
                    placeholder="Contact name"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-theme-text-secondary mb-2 block">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-4.5 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    className={`${inputClass} pl-12`}
                    placeholder="1234567890"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-theme-text-secondary mb-2 block">Email (optional)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-4.5 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={contact.email || ''}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    className={`${inputClass} pl-12`}
                    placeholder="contact@email.com"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-theme-text-secondary mb-2 block">Relationship</label>
                <input
                  type="text"
                  value={contact.relationship}
                  onChange={(e) => setContact({ ...contact, relationship: e.target.value })}
                  className={inputClass}
                  placeholder="e.g. Parent, Friend"
                />
              </div>
            </div>
          ) : user?.emergency_contacts?.[0] ? (
            <div className="space-y-3.5 text-sm font-semibold text-theme-text-secondary">
              <p><span className="text-theme-text-primary">Name:</span> {user.emergency_contacts[0].name}</p>
              <p><span className="text-theme-text-primary">Phone:</span> {user.emergency_contacts[0].phone}</p>
              {user.emergency_contacts[0].email && (
                <p><span className="text-theme-text-primary">Email:</span> {user.emergency_contacts[0].email}</p>
              )}
              <p><span className="text-theme-text-primary">Relationship:</span> {user.emergency_contacts[0].relationship}</p>
            </div>
          ) : (
            <p className="text-sm font-semibold text-theme-text-secondary">
              No emergency contact added yet.
            </p>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-sm border border-red-100/30">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 rounded-2xl bg-green-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-sm border border-emerald-100/30">
            {success}
          </div>
        )}

        {isEditing ? (
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsEditing(false);
              }}
              disabled={saving}
              className="flex-1 app-btn-pill-secondary py-3.5 px-6 font-bold text-sm"
            >
              <X className="w-4 h-4 mr-2 inline" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex-1 app-btn-pill-primary py-3.5 px-6 font-bold text-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : <Save className="w-4 h-4 mr-2 inline" />}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="w-full flex items-center justify-start gap-4 p-5 rounded-2xl bg-theme-surface border border-theme-border text-theme-text-primary hover:border-theme-orange hover:-translate-y-0.5 shadow-sm hover:shadow-md transition-all duration-300 font-bold text-sm"
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-theme-blue" />
              )}
              <span>Theme: {darkMode ? 'Dark' : 'Light'}</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-start gap-4 p-5 rounded-2xl bg-theme-surface border border-theme-border text-theme-text-primary hover:border-red-400 hover:text-red-500 hover:-translate-y-0.5 shadow-sm hover:shadow-md transition-all duration-300 font-bold text-sm"
            >
              <Settings className="w-5 h-5 text-gray-400" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileScreen;
