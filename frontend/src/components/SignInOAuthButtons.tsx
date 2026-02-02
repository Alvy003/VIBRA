import { useSignIn } from "@clerk/clerk-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./ui/button";

const SignInOAuthButtons = () => {
	const { signIn, isLoaded } = useSignIn();

	if (!isLoaded) {
		return null;
	}

	const signInWithGoogle = () => {
		signIn.authenticateWithRedirect({
			strategy: "oauth_google",
			redirectUrl: "/sso-callback",
			redirectUrlComplete: "/auth-callback",
		});
	};

	return (
		<Button onClick={signInWithGoogle} variant={"secondary"} className={cn(
			buttonVariants({ variant: "outline" }),
			"bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-sm text-white hover:text-white transition-all duration-200"
		  )}
		>
			<img src='/google.png' alt='Google' className='size-5' />
			Sign in
		</Button>
	);
};
export default SignInOAuthButtons;