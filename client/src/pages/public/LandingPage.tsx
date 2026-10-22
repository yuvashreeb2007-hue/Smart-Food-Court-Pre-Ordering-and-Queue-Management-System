import React from 'react';
import { Link } from 'react-router-dom';
import { Utensils, QrCode, Clock, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useOrders } from '../../contexts/OrderContext';
import { FoodCard } from '../../components/food/FoodCard';

export const LandingPage: React.FC = () => {
  const { foodItems } = useOrders();
  const featuredItems = foodItems.slice(0, 4);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#E8F1E9]/60 via-[#FAF8F3] to-[#FAF8F3] pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-[#E5E7E2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E8F1E9] text-[#244C3A] text-xs font-semibold border border-[#244C3A]/20">
                <Sparkles className="w-3.5 h-3.5 text-[#F3B562]" />
                <span>Next-Generation College Food Court Experience</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-[#242B26] tracking-tight leading-tight">
                Skip the Crowd. <br />
                <span className="text-[#244C3A]">Pre-Order & Track</span> in Real Time.
              </h1>

              <p className="text-base sm:text-lg text-[#68716A] max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Order your favorite campus meals ahead of time, receive a shared daily queue token, and pick up hot food at the counter without waiting in endless physical queues.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <Link to="/menu">
                  <Button size="lg" variant="primary" icon={<ArrowRight className="w-5 h-5" />}>
                    Explore Live Menu
                  </Button>
                </Link>
                <Link to="/my-orders">
                  <Button size="lg" variant="outline" icon={<Clock className="w-4 h-4" />}>
                    Track Active Orders
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#E5E7E2] max-w-lg mx-auto lg:mx-0 text-left">
                <div>
                  <span className="text-xl font-bold text-[#244C3A] block">101+</span>
                  <span className="text-xs text-[#68716A]">Daily Sequence</span>
                </div>
                <div>
                  <span className="text-xl font-bold text-[#244C3A] block">100%</span>
                  <span className="text-xs text-[#68716A]">Verified QR Pickup</span>
                </div>
                <div>
                  <span className="text-xl font-bold text-[#244C3A] block">Zero</span>
                  <span className="text-xs text-[#68716A]">Counter Queues</span>
                </div>
              </div>
            </div>

            {/* Right Hero Visual */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md bg-white p-6 rounded-3xl border border-[#E5E7E2] shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E7E2]">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-[#242B26]">Live Counter Queue</span>
                  </div>
                  <span className="text-xs bg-[#E8F1E9] text-[#244C3A] font-bold px-2 py-0.5 rounded">
                    Now Serving
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E5E7E2] text-center space-y-1">
                  <span className="text-xs text-[#68716A] uppercase tracking-wider font-medium">
                    Current Calling Token
                  </span>
                  <div className="text-4xl font-black text-[#244C3A] tracking-wider">
                    #101
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-700 font-medium pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready at Counter 2
                  </div>
                </div>

                <div className="space-y-2 text-xs text-[#68716A]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-200">
                    <span>Token #102 (Offline Counter)</span>
                    <span className="text-amber-700 font-semibold">Preparing</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-200">
                    <span>Token #103 (Online App)</span>
                    <span className="text-sky-700 font-semibold">Ordered</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#244C3A] bg-[#E8F1E9] px-3 py-1 rounded-full">
            Streamlined Experience
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#242B26] mt-3">
            How Pre-Ordering Works
          </h2>
          <p className="text-sm text-[#68716A] mt-2">
            Engineered for rapid college meal times with zero confusion.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7E2] shadow-xs relative">
            <div className="w-12 h-12 rounded-xl bg-[#E8F1E9] text-[#244C3A] flex items-center justify-center font-bold text-lg mb-4">
              01
            </div>
            <h3 className="font-bold text-base text-[#242B26] mb-2">Select From Live Menu</h3>
            <p className="text-xs text-[#68716A] leading-relaxed">
              Explore freshly prepared South Indian, North Indian, snacks, and beverages. Real-time availability indicators show what's hot and ready.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E5E7E2] shadow-xs relative">
            <div className="w-12 h-12 rounded-xl bg-[#F3B562]/20 text-[#242B26] flex items-center justify-center font-bold text-lg mb-4">
              02
            </div>
            <h3 className="font-bold text-base text-[#242B26] mb-2">Get Shared Daily Token</h3>
            <p className="text-xs text-[#68716A] leading-relaxed">
              Online and offline orders share the exact same sequential daily token sequence starting at 101. No skipped numbers, complete fairness.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E5E7E2] shadow-xs relative">
            <div className="w-12 h-12 rounded-xl bg-[#E8F1E9] text-[#244C3A] flex items-center justify-center font-bold text-lg mb-4">
              03
            </div>
            <h3 className="font-bold text-base text-[#242B26] mb-2">Scan QR & Collect Meal</h3>
            <p className="text-xs text-[#68716A] leading-relaxed">
              Once your token status reaches Ready, present your opaque verification QR code at the counter. Cashier verifies atomically in one tap.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Items Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#242B26]">Popular Food Court Favorites</h2>
            <p className="text-xs text-[#68716A] mt-1">Prepared fresh daily by our kitchen staff</p>
          </div>
          <Link to="/menu" className="text-xs font-semibold text-[#244C3A] hover:underline flex items-center gap-1">
            <span>View Full Menu</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredItems.map(item => (
            <FoodCard key={item.id} foodItem={item} />
          ))}
        </div>
      </section>
    </div>
  );
};
