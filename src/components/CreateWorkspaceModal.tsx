import React, { useState } from 'react';
import { X, Building2, Sparkles } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({ isOpen, onClose }) => {
  const { createWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [teamDetails, setTeamDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !productName.trim()) {
      setError('Workspace name and Product name are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createWorkspace({
        name: name.trim(),
        productName: productName.trim(),
        productDescription: productDescription.trim(),
        teamDetails: teamDetails.trim(),
      });
      onClose();
      setName('');
      setProductName('');
      setProductDescription('');
      setTeamDetails('');
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-brand-surface dark:bg-brand-dark-card rounded-3xl shadow-elevated border border-brand-border dark:border-brand-dark-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border dark:border-brand-dark-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/15 text-brand-primary flex items-center justify-center">
              <Building2 size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-brand-dark dark:text-white">
                Create Product Workspace
              </h3>
              <p className="text-xs text-brand-secondary">
                Isolate product records, feature history, and knowledge graphs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-brand-secondary hover:text-brand-dark dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-brand-error-light text-brand-error border border-brand-error/20">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-brand-dark dark:text-white mb-1.5">
              Workspace Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme FinTech Workspace"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg dark:bg-brand-dark text-brand-text dark:text-white focus:outline-none focus:border-brand-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-dark dark:text-white mb-1.5">
              Product Name *
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. PayFlow Global API"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg dark:bg-brand-dark text-brand-text dark:text-white focus:outline-none focus:border-brand-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-dark dark:text-white mb-1.5">
              Product Description
            </label>
            <textarea
              rows={3}
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="High-level description of this product's architecture and domain..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg dark:bg-brand-dark text-brand-text dark:text-white focus:outline-none focus:border-brand-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-dark dark:text-white mb-1.5">
              Team & Module Details (Optional)
            </label>
            <input
              type="text"
              value={teamDetails}
              onChange={(e) => setTeamDetails(e.target.value)}
              placeholder="e.g. Core Engineering (6 members)"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg dark:bg-brand-dark text-brand-text dark:text-white focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-brand-secondary hover:text-brand-dark"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover transition-colors shadow-sm disabled:opacity-60"
            >
              {isSubmitting ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
