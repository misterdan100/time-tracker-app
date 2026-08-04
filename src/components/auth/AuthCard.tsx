import React, { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import Logo from '../Logo';

interface AuthCardProps {
  /** Screen-reader title (the logo carries it visually). */
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Centered card shell shared by the login / forgot / reset password screens. */
const AuthCard: React.FC<AuthCardProps> = ({ title, subtitle, children }) => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Logo variant="full" className="h-12 w-auto" />
        </div>
        <CardTitle className="text-2xl sr-only">{title}</CardTitle>
        <p className="text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  </div>
);

export default AuthCard;
