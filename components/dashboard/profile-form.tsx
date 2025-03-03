"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import Select from "react-select"
import countryList from "react-select-country-list"

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City must be at least 2 characters"),
  state: z.string().optional(),
  country: z.string().min(2, "Country must be at least 2 characters"),
  postalCode: z.string().min(2, "Postal code must be at least 2 characters"),
})

type ProfileFormValues = z.infer<typeof profileSchema>

interface ProfileFormProps {
  initialData: ProfileFormValues
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  // Country options for the Select component
  const countryOptions = useMemo(() => countryList().getData(), [])
  
  // Custom styles for the Select component to match theme
  const customStyles = {
    control: (provided: any) => ({
      ...provided,
      backgroundColor: "var(--background)",
      borderColor: "var(--border)",
      height: "40px",
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: "var(--background)",
    }),
    option: (provided: any, state: { isSelected: any; isFocused: any }) => ({
      ...provided,
      backgroundColor: state.isSelected ? "var(--primary)" : state.isFocused ? "var(--accent)" : "transparent",
      color: state.isSelected ? "var(--primary-foreground)" : "var(--foreground)",
    }),
  }

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData,
  })

  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true)

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      })

      router.refresh()
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "There was a problem updating your profile.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...form.register("name")} />
        {form.formState.errors.name && <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...form.register("email")} />
        {form.formState.errors.email && <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" type="tel" {...form.register("phone")} />
        {form.formState.errors.phone && <p className="text-sm text-red-500">{form.formState.errors.phone.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" {...form.register("address")} />
        {form.formState.errors.address && (
          <p className="text-sm text-red-500">{form.formState.errors.address.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <Input id="city" {...form.register("city")} />
        {form.formState.errors.city && <p className="text-sm text-red-500">{form.formState.errors.city.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="state">State/Province</Label>
        <Input id="state" {...form.register("state")} />
        {form.formState.errors.state && <p className="text-sm text-red-500">{form.formState.errors.state.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Controller
          name="country"
          control={form.control}
          render={({ field }) => (
            <Select
              inputId="country"
              options={countryOptions}
              value={countryOptions.find((option) => option.value === field.value)}
              onChange={(option) => field.onChange(option ? option.value : '')}
              styles={customStyles}
              className="react-select-container"
              classNamePrefix="react-select"
            />
          )}
        />
        {form.formState.errors.country && (
          <p className="text-sm text-red-500">{form.formState.errors.country.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="postalCode">Postal Code</Label>
        <Input id="postalCode" {...form.register("postalCode")} />
        {form.formState.errors.postalCode && (
          <p className="text-sm text-red-500">{form.formState.errors.postalCode.message}</p>
        )}
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Updating..." : "Update Profile"}
      </Button>
    </form>
  )
}

