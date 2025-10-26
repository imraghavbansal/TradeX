"use client"
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import InputField from "@/components/forms/InputField";
import FooterLink from "@/components/forms/FooterLink";
import { signInWithEmail } from "@/lib/actions/auth.actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface SignInFormData {
  email: string;
  password: string;
}

const SignIn = () => {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onBlur',
  },);

  const onSubmit = async (data: SignInFormData) => {
      try {
        const result = await signInWithEmail(data);
        if (result.success) router.push('/');
      } catch (error) {
        toast.error("Sign In Failed", {
          description: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        });
      }
    };

  return (
    <>
      <h1 className="form-title">Welcome back</h1>
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>

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

        <Button
          type="submit"
          disabled={isSubmitting}
          className="yellow-btn w-full mt-5"
        >
          {isSubmitting ? 'Signing In...' : 'Sign In'}
        </Button>

        <FooterLink
          text="Don't have an Account?"
          linkText="Create an Account"
          href="/sign-up"
        />
      </form>
    </>
  );
};

export default SignIn;
