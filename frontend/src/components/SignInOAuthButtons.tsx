import { useSignIn } from "@clerk/clerk-react";

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
		<button
			onClick={signInWithGoogle}
			className="flex items-center gap-2 px-2.5 py-1.5 md:px-4 md:py-2 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 backdrop-blur-sm text-white transition-all duration-200 active:scale-95 whitespace-nowrap"
		>
			<img src='/google.png' alt='Google' className='size-4 md:size-5' />
			<span className="text-xs md:text-sm font-semibold tracking-wider">Sign in</span>
		</button>
	);
};
export default SignInOAuthButtons;