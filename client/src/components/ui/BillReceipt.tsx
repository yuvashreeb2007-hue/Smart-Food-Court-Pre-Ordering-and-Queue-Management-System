import React from 'react';
import { Printer } from 'lucide-react';
import { Order } from '../../types';
import { Button } from './Button';

interface BillReceiptProps {
  order: Order;
  copyType?: 'customer' | 'kitchen';
  onClose?: () => void;
}

export const BillReceipt: React.FC<BillReceiptProps> = ({
  order,
  copyType = 'customer',
}) => {
  const handlePrint = () => {
    window.print();
  };

  const isKitchen = copyType === 'kitchen';

  return (
    <div className="bg-white rounded-xl border border-[#E5E7E2] p-6 max-w-md mx-auto shadow-sm">
      {/* Action buttons (hidden when printing) */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E7E2] no-print">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#68716A]">
          {isKitchen ? 'Kitchen Order Ticket (KOT)' : 'Digital Customer Bill'}
        </span>
        <Button size="sm" variant="outline" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
          Print Slip
        </Button>
      </div>

      {/* Printable receipt content */}
      <div className="text-[#242B26] font-mono text-xs">
        {/* Header */}
        <div className="text-center pb-3 border-b border-dashed border-[#E5E7E2]">
          <h2 className="text-base font-bold tracking-tight text-[#244C3A]">SMART FOOD COURT</h2>
          <p className="text-[11px] text-[#68716A]">Campus Center, Ground Floor</p>
          <p className="text-[10px] text-[#68716A]">Timezone: Asia/Kolkata</p>
          <div className="mt-2 inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-[#FAF8F3] border border-[#E5E7E2]">
            {isKitchen ? '*** KITCHEN COPY (KOT) ***' : '*** CUSTOMER RECEIPT ***'}
          </div>
        </div>

        {/* Token Callout */}
        <div className="py-4 text-center border-b border-dashed border-[#E5E7E2] bg-[#FAF8F3]/50 my-2 rounded">
          <div className="text-xs uppercase font-medium text-[#68716A]">Daily Sequence Token</div>
          <div className="text-3xl font-extrabold text-[#244C3A] tracking-wider">
            #{order.tokenNumber}
          </div>
          <div className="text-[11px] text-[#68716A] mt-1">
            Order Type: <span className="font-semibold uppercase">{order.orderType}</span>
          </div>
        </div>

        {/* Order Details */}
        <div className="py-2 border-b border-dashed border-[#E5E7E2] space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-[#68716A]">Date:</span>
            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#68716A]">Time:</span>
            <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#68716A]">Ref ID:</span>
            <span className="font-semibold">{order.id}</span>
          </div>
          {order.customerName && (
            <div className="flex justify-between">
              <span className="text-[#68716A]">Customer:</span>
              <span>{order.customerName}</span>
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="py-3 border-b border-dashed border-[#E5E7E2]">
          <div className="grid grid-cols-12 font-bold pb-1 text-[11px] text-[#68716A]">
            <span className="col-span-7">Item</span>
            <span className="col-span-2 text-center">Qty</span>
            <span className="col-span-3 text-right">Amount</span>
          </div>
          <div className="space-y-1.5 pt-1">
            {order.items.map(item => (
              <div key={item.id} className="grid grid-cols-12 text-[11px]">
                <span className="col-span-7 font-medium text-[#242B26]">{item.foodName}</span>
                <span className="col-span-2 text-center">{item.quantity}</span>
                <span className="col-span-3 text-right">₹{item.lineTotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Financials (Hidden or simplified for KOT if preferred, but shown here clearly) */}
        <div className="py-3 border-b border-dashed border-[#E5E7E2] space-y-1">
          <div className="flex justify-between text-xs font-bold pt-1">
            <span>Total Payable:</span>
            <span className="text-[#244C3A]">₹{order.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-[#68716A]">
            <span>Payment Method:</span>
            <span className="uppercase font-semibold">{order.paymentMethod}</span>
          </div>
          <div className="flex justify-between text-[11px] text-[#68716A]">
            <span>Payment Status:</span>
            <span className={`font-semibold uppercase ${order.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
              {order.paymentStatus}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 text-center text-[10px] text-[#68716A] space-y-0.5">
          <p>Thank you for ordering at Smart Food Court!</p>
          <p>Please watch the display screens for Token #{order.tokenNumber}</p>
        </div>
      </div>
    </div>
  );
};
