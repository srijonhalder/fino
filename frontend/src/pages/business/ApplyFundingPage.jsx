import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { submitBusinessApplication } from '../../services/business.api';
import { toast } from 'react-toastify';
import { FiUpload } from 'react-icons/fi';

const CATEGORIES = [
  { value: 'food_beverage', label: 'Food & Beverage' },
  { value: 'retail', label: 'Retail' },
  { value: 'services', label: 'Services' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'education', label: 'Education' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'other', label: 'Other' },
];
const DURATION_OPTIONS = [6, 12, 24, 36, 60];

const STEP_LABELS = ["Basic Info", "Location", "Financials", "Funding Terms", "Media & Review"];

const FIELD_MAP = {
  businessName: 'name',
  tokenPriceINR: 'tokenPrice',
  revenueShareDuration: 'revenueSharingDuration',
  yearEstablished: 'yearsInOperation',
};

const ApplyFundingPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [documents, setDocuments] = useState([]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { tokenPriceINR: 100, revenueSharePercentage: 10, revenueShareDuration: 12 },
  });

  const fundingGoal = watch('fundingGoal');
  const tokenPrice = watch('tokenPriceINR') || 100;
  const revShare = watch('revenueSharePercentage');
  const totalTokens = fundingGoal ? Math.floor(Number(fundingGoal) / Number(tokenPrice)) : 0;

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v) { const mappedKey = FIELD_MAP[k] || k; formData.append(mappedKey, v); }
      });
      photos.forEach((f) => formData.append('photos', f));
      documents.forEach((f) => formData.append('documents', f));
      await submitBusinessApplication(formData);
      toast.success('Application submitted! Community will review it shortly.');
      navigate('/dashboard/business');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep((p) => Math.min(p + 1, 5));
  const prevStep = () => setStep((p) => Math.max(p - 1, 1));
  const inpCls = "input-dark";
  const labelCls = "block text-sm font-medium text-gray-300 mb-1.5";
  const errCls = "text-red-400 text-xs mt-1";

  return (
    <div className="min-h-screen bg-dark-900 pt-20 pb-12 px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb w-96 h-96 bg-primary-600 absolute -top-48 -left-24 opacity-10" />
        <div className="glow-orb w-80 h-80 bg-cyan-500 absolute bottom-0 right-0 opacity-8" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white">Apply for Funding</h1>
          <p className="text-gray-400 mt-2">Step {step} of 5 — {STEP_LABELS[step - 1]}</p>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-1.5 mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${step >= s ? 'bg-gradient-to-r from-primary-500 to-cyan-500' : 'bg-white/10'}`} />
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="glass-strong rounded-2xl p-8">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-white mb-5">Basic Information</h2>
                <div>
                  <label className={labelCls}>Business Name *</label>
                  <input {...register('businessName', { required: 'Required' })} className={inpCls} placeholder="Your business name" />
                  {errors.businessName && <p className={errCls}>{errors.businessName.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Category *</label>
                  <select {...register('category', { required: 'Required' })} className={inpCls}>
                    <option value="" style={{ background: "#1A2235" }}>Select category...</option>
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value} style={{ background: "#1A2235" }}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Description *</label>
                  <textarea {...register('description', { required: 'Required' })} className={inpCls} rows={3} placeholder="What does your business do?" style={{ resize: "vertical" }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Year Established</label>
                    <input type="number" {...register('yearEstablished')} className={inpCls} placeholder="2018" />
                  </div>
                  <div>
                    <label className={labelCls}>Employees</label>
                    <input type="number" {...register('employeeCount')} className={inpCls} placeholder="15" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-white mb-5">Location & Contact</h2>
                <div>
                  <label className={labelCls}>Address</label>
                  <input {...register('address')} className={inpCls} placeholder="Street address" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>City *</label>
                    <input {...register('city', { required: 'Required' })} className={inpCls} placeholder="Mumbai" />
                  </div>
                  <div>
                    <label className={labelCls}>State *</label>
                    <input {...register('state', { required: 'Required' })} className={inpCls} placeholder="Maharashtra" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Pincode</label>
                    <input {...register('pincode')} className={inpCls} placeholder="400001" />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input {...register('businessPhone')} className={inpCls} placeholder="9876543210" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Website</label>
                  <input {...register('website')} className={inpCls} placeholder="https://yourbusiness.com" />
                </div>
              </div>
            )}

            {/* Step 3: Financials */}
            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-white mb-5">Financial Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Avg Monthly Revenue (INR)</label>
                    <input type="number" {...register('averageMonthlyRevenue')} className={inpCls} placeholder="150000" />
                  </div>
                  <div>
                    <label className={labelCls}>Profit Margin (%)</label>
                    <input type="number" {...register('profitMargin')} className={inpCls} placeholder="25" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>GST Number</label>
                  <input {...register('gstNumber')} className={inpCls} placeholder="22AAAAA0000A1Z5" />
                </div>
                <div>
                  <label className={labelCls}>Documents (GST returns, bank statements)</label>
                  <div className="border border-dashed border-white/15 rounded-xl p-4 bg-white/[0.02]">
                    <input type="file" accept=".pdf,.jpg,.png" multiple onChange={(e) => setDocuments(Array.from(e.target.files))}
                      className="text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-500/20 file:text-primary-300 hover:file:bg-primary-500/30 cursor-pointer w-full" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Funding Terms */}
            {step === 4 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-white mb-5">Funding Terms</h2>
                <div>
                  <label className={labelCls}>Funding Goal (INR) *</label>
                  <input type="number" {...register('fundingGoal', { required: 'Required' })} className={inpCls} placeholder="500000" />
                </div>
                <div>
                  <label className={labelCls}>Revenue Share: <span className="text-primary-400">{revShare}%</span></label>
                  <input type="range" min="5" max="30" {...register('revenueSharePercentage')} className="w-full accent-primary-500 h-1.5 bg-white/10 rounded-full" />
                  <div className="flex justify-between text-xs text-gray-500 mt-1"><span>5%</span><span>30%</span></div>
                </div>
                <div>
                  <label className={labelCls}>Token Price (INR)</label>
                  <input type="number" {...register('tokenPriceINR')} className={inpCls} />
                </div>
                <div>
                  <label className={labelCls}>Revenue Share Duration (months)</label>
                  <select {...register('revenueShareDuration')} className={inpCls}>
                    {DURATION_OPTIONS.map((d) => <option key={d} value={d} style={{ background: "#1A2235" }}>{d} months</option>)}
                  </select>
                </div>
                {fundingGoal && (
                  <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/20 text-sm text-gray-300">
                    You will issue <strong className="text-white">{totalTokens} tokens</strong> at ₹{tokenPrice} each.
                    Investors will earn <strong className="text-primary-400">{revShare}%</strong> of monthly revenue.
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Media */}
            {step === 5 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-white mb-5">Business Media & Review</h2>
                <div>
                  <label className={labelCls}>Business Photos (up to 5)</label>
                  <div className="border-2 border-dashed border-white/15 rounded-xl p-8 text-center bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                    <input type="file" accept="image/*" multiple onChange={(e) => setPhotos(Array.from(e.target.files).slice(0, 5))} className="hidden" id="photos" />
                    <label htmlFor="photos" className="cursor-pointer">
                      <FiUpload className="mx-auto text-3xl text-gray-500 mb-3" />
                      <p className="text-sm text-gray-400">Click to upload photos</p>
                      <p className="text-xs text-gray-600 mt-1">Maximum 5 images</p>
                    </label>
                    {photos.length > 0 && <p className="text-xs text-primary-400 mt-2">{photos.length} file(s) selected</p>}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-300">
                  <p className="font-medium text-white mb-1">Ready to Submit?</p>
                  <p>Your application will be reviewed by community governance with AI-assisted scoring. Once approved, you can start receiving investments.</p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            {step > 1 ? (
              <button type="button" onClick={prevStep} className="btn-secondary text-sm">Back</button>
            ) : <div />}
            <div className="ml-auto">
              {step < 5 ? (
                <button type="button" onClick={nextStep} className="btn-primary text-sm">Next Step</button>
              ) : (
                <button type="submit" disabled={loading} className="btn-primary text-sm disabled:opacity-50">
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyFundingPage;

