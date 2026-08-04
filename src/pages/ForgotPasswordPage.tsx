import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import AuthCard from '../components/auth/AuthCard';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { requestPasswordReset } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email');
      return;
    }

    setSubmitting(true);
    const { error: resetError } = await requestPasswordReset(email.trim());
    setSubmitting(false);

    if (resetError) {
      // Mostly rate limiting ("you can only request this after X seconds").
      setError(resetError);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthCard title="Arq Time" subtitle="Check your inbox">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              If an account exists for <span className="font-medium">{email}</span>, we sent a link
              to reset your password. The link expires in 1 hour.
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Nothing in your inbox? Check the spam folder, then{' '}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              try again
            </button>
            .
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Arq Time"
      subtitle="Enter your email and we'll send you a link to reset your password"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            autoFocus
            required
          />
        </div>
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
        )}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Sending...' : 'Send reset link'}
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </Button>
      </form>
    </AuthCard>
  );
};

export default ForgotPasswordPage;
