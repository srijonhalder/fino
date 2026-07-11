import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../hooks/useAuth';
import { submitKYC } from '../../services/auth.api';
import { toast } from 'react-toastify';
import { FiUpload, FiCheckCircle, FiShield, FiUser, FiCamera } from 'react-icons/fi';

const KYCPage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [selfie, setSelfie] = useState(null);
  const [preview, setPreview] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) { setSelfie(file); setPreview(URL.createObjectURL(file)); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.png', '.jpg', '.jpeg'] }, maxFiles: 1, maxSize: 5 * 1024 * 1024,
  });

  useEffect(() => {
    if (user?.kycStatus === 'verified') {
      navigate(user.role === 'business_owner' ? '/dashboard/business' : '/dashboard/investor');
    }
  }, [user, navigate]);

  const handleSubmit = async () => {
    if (!selfie) { toast.error('Please upload a selfie'); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('aadhaarNumber', aadhaarNumber);
      formData.append('panNumber', panNumber);
      formData.append('selfie', selfie);
      const res = await submitKYC(formData);
      updateUser(res.data.data?.user || { kycStatus: 'pending' });
      setSuccess(true);
      toast.success('KYC submitted! Verification in progress.');
      setTimeout(() => {
        navigate(user.role === 'business_owner' ? '/dashboard/business' : '/dashboard/investor');
      }, 2000);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <FiCheckCircle className="text-emerald-400 text-4xl" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">KYC Submitted!</h2>
          <p className="text-gray-400">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center py-16 px-4">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb w-96 h-96 bg-primary-600 absolute -top-32 -left-32" />
        <div className="glow-orb w-80 h-80 bg-cyan-500 absolute -bottom-24 -right-24" />
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg,#22D3A5,#22D3EE)" }}>
            <FiShield className="text-white text-2xl" />
          </div>
          <h2 className="text-3xl font-bold text-white">Complete KYC</h2>
          <p className="text-gray-400 mt-2">Verify your identity to unlock all features</p>
        </div>

        {/* Step Indicator */}
        <div className="flex gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex-1 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-all ${
                step >= s ? 'bg-gradient-to-br from-primary-600 to-cyan-500 text-white' : 'bg-white/10 text-gray-500'
              }`}>{s}</div>
              <div className={`h-1 w-full rounded ${step >= s ? 'bg-gradient-to-r from-primary-500 to-cyan-500' : 'bg-white/10'}`} />
            </div>
          ))}
        </div>

        <div className="glass-strong rounded-2xl p-8">
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="font-bold text-white flex items-center gap-2"><FiUser className="text-primary-400" /> Identity Documents</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">PAN Number</label>
                <input
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  className="input-dark"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Aadhaar Number</label>
                <input
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                  className="input-dark"
                  placeholder="1234 5678 9012"
                  maxLength={12}
                />
                <p className="text-xs text-gray-500 mt-1.5">Encrypted and never stored in plain text</p>
              </div>
              <button
                onClick={() => { if (panNumber && aadhaarNumber) setStep(2); else toast.error('Fill all fields'); }}
                className="btn-primary w-full"
              >
                Next Step
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h3 className="font-bold text-white flex items-center gap-2"><FiCamera className="text-cyan-400" /> Upload Selfie</h3>
              <div {...getRootProps()}
                className={`rounded-xl p-8 text-center cursor-pointer transition-all border-2 border-dashed ${
                  isDragActive ? 'border-primary-500 bg-primary-500/10' : 'border-white/15 hover:border-white/30 bg-white/[0.03]'
                }`}>
                <input {...getInputProps()} />
                {preview ? (
                  <img src={preview} alt="Selfie" className="w-36 h-36 rounded-full mx-auto object-cover ring-2 ring-primary-500/50" />
                ) : (
                  <>
                    <FiUpload className="mx-auto text-3xl text-gray-500 mb-3" />
                    <p className="text-sm text-gray-400">Drag & drop or click to upload selfie</p>
                    <p className="text-xs text-gray-600 mt-1">PNG, JPG up to 5MB</p>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500">Clear photo of your face in good lighting</p>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
                  {loading ? 'Verifying...' : 'Submit KYC'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KYCPage;

