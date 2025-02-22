"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

const shippingSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  country: z.string().min(2, "Country is required"),
  postalCode: z.string().min(2, "Postal code is required"),
})

type ShippingFormValues = z.infer<typeof shippingSchema>

interface ShippingFormProps {
  onSubmit: (data: ShippingFormValues) => void
}

const STORAGE_KEY = "checkout_shipping_info"

export function ShippingForm({ onSubmit }: ShippingFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingSchema),
    mode: "onChange", // Enable real-time validation
  })

  // Load saved form data on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY)
    if (savedData) {
      reset(JSON.parse(savedData))
    }
  }, [reset])

  const onSubmitForm = (data: ShippingFormValues) => {
    // Save form data to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      <h2 className="text-2xl font-bold mb-6">Shipping Information</h2>

      <div>
        <Label htmlFor="fullName">Full Name</Label>
        <Input id="fullName" {...register("fullName")} />
        {errors.fullName && <p className="text-sm text-red-500">{errors.fullName.message}</p>}
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Input id="address" {...register("address")} />
        {errors.address && <p className="text-sm text-red-500">{errors.address.message}</p>}
      </div>

      <div>
        <Label htmlFor="city">City</Label>
        <Input id="city" {...register("city")} />
        {errors.city && <p className="text-sm text-red-500">{errors.city.message}</p>}
      </div>

      <div>
        <Label htmlFor="country">Country</Label>
        <Input id="country" {...register("country")} />
        {errors.country && <p className="text-sm text-red-500">{errors.country.message}</p>}
      </div>

      <div>
        <Label htmlFor="postalCode">Postal Code</Label>
        <Input id="postalCode" {...register("postalCode")} />
        {errors.postalCode && <p className="text-sm text-red-500">{errors.postalCode.message}</p>}
      </div>

      <div className="flex justify-end gap-4 mt-6">
        <Button type="submit" disabled={!isValid}>
          Next
        </Button>
      </div>
    </form>
  )
}

