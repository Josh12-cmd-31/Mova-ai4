import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { X, Zap, Check, CreditCard, Star, Rocket, Building2 } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { db, auth } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  onSuccess: () => void;
}

type PlanType = 'mova1' | 'mova4' | 'business';

interface PlanDetails {
  id: PlanType;
  name: string;
  price: string;
  description: string;
  features: string[];
  badge?: string;
  icon: React.ReactNode;
  color: string;
}

export default function SubscriptionModal({ isOpen, onClose, userEmail, onSuccess }: SubscriptionModalProps) {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('mova1');
  const paypalClientId = (import.meta as any).env.VITE_PAYPAL_CLIENT_ID;

  const plans: PlanDetails[] = [
    {
      id: 'mova1',
      name: 'Mova 1',
      price: '$8',
      description: t('lite_model_desc'),
      badge: t('popular'),
      icon: <Star size={20} />,
      color: 'emerald',
      features: [
        t('unlimited_daily_messages'),
        t('priority_access_models')
      ]
    },
    {
      id: 'mova4',
      name: 'Mova 4',
      price: '$19',
      description: t('pro_model_desc'),
      badge: t('recommend'),
      icon: <Rocket size={20} />,
      color: 'blue',
      features: [
        t('unlimited_daily_messages'),
        t('priority_access_models'),
        t('advanced_orchestration_features')
      ]
    },
    {
      id: 'business',
      name: 'Mova Business',
      price: '$99',
      description: 'For teams and enterprises',
      icon: <Building2 size={20} />,
      color: 'purple',
      features: [
        'All Pro features',
        'Team collaboration',
        'Priority support',
        'Custom model training'
      ]
    }
  ];

  const handleSubscriptionSuccess = async (details: any) => {
    if (!auth.currentUser) return;
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        isSubscribed: true,
        plan: selectedPlan,
        subscriptionId: details.id || 'manual_sub'
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating subscription status:", error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
          >
            {/* Left Side: Plans */}
            <div className="flex-1 p-8 border-b md:border-b-0 md:border-r border-white/5 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">{t('upgrade_to_pro')}</h2>
                <button
                  onClick={onClose}
                  className="md:hidden p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative p-5 rounded-2xl border transition-all text-left group ${
                      selectedPlan === plan.id
                        ? `bg-${plan.color}-500/10 border-${plan.color}-500/50 ring-1 ring-${plan.color}-500/50`
                        : 'bg-zinc-950/50 border-white/5 hover:border-white/10'
                    }`}
                  >
                    {plan.badge && (
                      <span className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-${plan.color}-500 text-white shadow-lg`}>
                        {plan.badge}
                      </span>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          selectedPlan === plan.id ? `bg-${plan.color}-500 text-white` : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {plan.icon}
                        </div>
                        <div>
                          <h3 className="font-bold text-zinc-100">{plan.name}</h3>
                          <p className="text-xs text-zinc-500">{plan.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-white">{plan.price}</div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold">/{t('month')}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Side: Checkout */}
            <div className="w-full md:w-80 bg-zinc-950/50 p-8 flex flex-col">
              <div className="hidden md:flex justify-end mb-6">
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 space-y-8">
                <div>
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">{t('whats_included')}</h4>
                  <div className="space-y-3">
                    {plans.find(p => p.id === selectedPlan)?.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-3 text-zinc-300">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                          <Check size={12} />
                        </div>
                        <span className="text-xs font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  {paypalClientId ? (
                    <PayPalScriptProvider options={{ clientId: paypalClientId, vault: true, intent: "subscription" }}>
                      <PayPalButtons
                        key={selectedPlan} // Re-render buttons when plan changes
                        style={{ layout: "vertical", shape: "pill" }}
                        createSubscription={(data, actions) => {
                          // In a real app, you'd use different plan IDs from PayPal dashboard
                          const planIds: Record<PlanType, string> = {
                            mova1: "P-MOVA1_PLAN_ID",
                            mova4: "P-MOVA4_PLAN_ID",
                            business: "P-BUSINESS_PLAN_ID"
                          };
                          return actions.subscription.create({
                            plan_id: planIds[selectedPlan]
                          });
                        }}
                        onApprove={async (data, actions) => {
                          await handleSubscriptionSuccess(data);
                        }}
                      />
                    </PayPalScriptProvider>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                        <p className="text-amber-500 text-[10px] font-medium leading-relaxed">{t('paypal_not_configured')}</p>
                      </div>
                      <button
                        onClick={() => handleSubscriptionSuccess({ id: `demo_${selectedPlan}` })}
                        className="w-full bg-white text-black py-3 rounded-xl font-bold hover:bg-zinc-200 transition-all text-sm shadow-xl"
                      >
                        {t('simulate_success_demo')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
                <CreditCard size={12} />
                {t('secure_payment_via_paypal')}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
