"use client"
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import InputField from "@/components/forms/InputField";
import SelectField from "@/components/forms/SelectField";
import { INVESTMENT_GOALS, PREFERRED_INDUSTRIES, RISK_TOLERANCE_OPTIONS } from "@/lib/constants";
import {CountrySelectField} from "@/components/forms/CountrySelectField";
import FooterLink from "@/components/forms/FooterLink";
import { signUpWithEmail } from "@/lib/actions/auth.actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface SignUpFormData {
  fullName: string;
  email: string;
  password: string;
  country: string;
  investmentGoals: string;
  riskTolerance: string;
  preferredIndustry: string;
}

const SignUp = () => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      country: 'India',
      investmentGoals: 'Growth',
      riskTolerance: 'Medium',
      preferredIndustry: 'Technology',
    },
    mode: 'onBlur',
  },);

  const onSubmit = async (data: SignUpFormData) => {
    try {
      const result = await signUpWithEmail(data);
      if (result.success) router.push('/');
    } catch (error) {
      toast.error("Sign Up Failed", {
        description: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
      });
    }
  };

  return (
    <>
      <h1 className="form-title">Sign Up & Personalize</h1>
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <InputField
        name="fullName"
        label="Full Name"
        placeholder="John Doe"
        register={register}
        error={errors.fullName}
        validation={{ required: 'Full name is required', minLength: 2 }}
        />

        <InputField
        name="email"
        label="Email"
        placeholder="Enter your Email"
        register={register}
        error={errors.email}
        validation={{ required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' } }}
        />

        <InputField
        name="password"
        label="Password"
        placeholder="Enter a strong password"
        type="password"
        register={register}
        error={errors.password}
        validation={{ required: 'Password is required', minLength: 8 }}
        />

      <CountrySelectField 
        name="country"
        label="Country"
        control={control}
        error={errors.country}
        required
      />
       

       <SelectField 
       name="investmentGoals"
       label="Investment Goals"
       placeholder="Select your investment goals"
       options={INVESTMENT_GOALS}
       control = {control}
       error={errors.investmentGoals}
       required
       />

       <SelectField 
       name="riskTolerance"
       label="Risk Tolerance"
       placeholder="Select your risk level"
       options={RISK_TOLERANCE_OPTIONS}
       control = {control}
       error={errors.riskTolerance}
       required
       />

       <SelectField 
       name="preferredIndustry"
       label="Preferred Industry"
       placeholder="Select your preferred industry"
       options={PREFERRED_INDUSTRIES}
       control = {control}
       error={errors.preferredIndustry}
       required
       />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="yellow-btn w-full mt-5"
        >
          {isSubmitting ? 'Signing Up...' : 'Start Your Investment Journey'}
        </Button>

        <FooterLink
          text="Already have an account?"
          linkText="Sign In"
          href="/sign-in"
        />
      </form>
    </>
  );
};

export default SignUp;
