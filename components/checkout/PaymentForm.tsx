"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const paymentSchema = z.object({
  cardNumber: z.string().regex(/^\d{16}$/, "Card number must be 16 digits"),
  cardHolder: z.string().min(2, "Cardholder name is required"),
  expirationDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Expiration date must be in MM/YY format"),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV must be 3 or 4 digits"),
})

type PaymentFormValues = z.infer<typeof paymentSchema>

interface PaymentFormProps {
  onSubmit: (data: PaymentFormValues) => void
}

export function PaymentForm({ onSubmit }: PaymentFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Payment Information</h2>
      <div>
        <Label htmlFor="cardNumber">Card Number</Label>
        <Input id="cardNumber" {...register("cardNumber")} placeholder="1234 5678 9012 3456" />
        {errors.cardNumber && <p className="text-sm text-red-500">{errors.cardNumber.message}</p>}
      </div>
      <div>
        <Label htmlFor="cardHolder">Cardholder Name</Label>
        <Input id="cardHolder" {...register("cardHolder")} placeholder="John Doe" />
        {errors.cardHolder && <p className="text-sm text-red-500">{errors.cardHolder.message}</p>}
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <Label htmlFor="expirationDate">Expiration Date</Label>
          <Input id="expirationDate" {...register("expirationDate")} placeholder="MM/YY" />
          {errors.expirationDate && <p className="text-sm text-red-500">{errors.expirationDate.message}</p>}
        </div>
        <div className="flex-1">
          <Label htmlFor="cvv">CVV</Label>
          <Input id="cvv" {...register("cvv")} placeholder="123" />
          {errors.cvv && <p className="text-sm text-red-500">{errors.cvv.message}</p>}
        </div>
      </div>
      <Button type="submit" className="w-full">
        Review Order
      </Button>
    </form>
  )
}

