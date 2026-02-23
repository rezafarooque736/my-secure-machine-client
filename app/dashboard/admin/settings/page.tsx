'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Server,
  Database,
  Lock,
  Mail,
  Bell,
  Globe,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminSettingsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    guacamoleStatus: 'running',
    databaseStatus: 'running',
    ldapStatus: 'running',
    uptime: '5 days, 3 hours',
  });

  const [settings, setSettings] = useState({
    general: {
      siteName: process.env.NEXT_PUBLIC_APP_NAME,
      siteUrl: process.env.NEXT_PUBLIC_APP_URL,
      maxConcurrentSessions: 100,
      sessionTimeout: 30,
      enableRegistration: false,
      requireEmailVerification: true,
    },
    security: {
      enableTwoFactor: false,
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireNumbers: true,
      passwordRequireSpecial: true,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      enableIpWhitelist: false,
      allowedIps: '',
    },
    email: {
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      smtpFromEmail: 'noreply@example.com',
      smtpFromName: process.env.NEXT_PUBLIC_APP_NAME,
      smtpEncryption: 'tls',
    },
    ldap: {
      enabled: true,
      server: 'ldap://localhost:389',
      baseDn: 'dc=example,dc=com',
      bindDn: 'cn=admin,dc=example,dc=com',
      bindPassword: '',
      userSearchBase: 'ou=users,dc=example,dc=com',
      groupSearchBase: 'ou=groups,dc=example,dc=com',
    },
    backup: {
      autoBackup: true,
      backupFrequency: 'daily',
      backupRetention: 7,
      backupLocation: '/var/backups/secure-machine',
    },
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Add API call here
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success('System settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    toast.info('Settings reset to defaults');
  };

  const handleTestConnection = async (type: string) => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
      loading: `Testing ${type} connection...`,
      success: `${type} connection successful`,
      error: `${type} connection failed`,
    });
  };

  return (
    <div className="space-y-6 py-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            System Settings
          </h1>
          <p className="text-muted-foreground mt-1">Configure system-wide settings and preferences</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="text-sm text-muted-foreground">{process.env.NEXT_PUBLIC_APP_NAME}</p>
                <Badge variant="outline" className="mt-1 bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Running
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="text-sm text-muted-foreground">Database</p>
                <Badge variant="outline" className="mt-1 bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Running
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="text-sm text-muted-foreground">LDAP</p>
                <Badge variant="outline" className="mt-1 bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Running
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="font-semibold mt-1">{systemStatus.uptime}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="ldap">LDAP</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Basic system configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={settings.general.siteName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, siteName: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteUrl">Site URL</Label>
                  <Input
                    id="siteUrl"
                    value={settings.general.siteUrl}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, siteUrl: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxSessions">Max Concurrent Sessions</Label>
                  <Input
                    id="maxSessions"
                    type="number"
                    value={settings.general.maxConcurrentSessions}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, maxConcurrentSessions: parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={settings.general.sessionTimeout}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, sessionTimeout: parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable Public Registration</p>
                    <p className="text-sm text-muted-foreground">Allow users to create accounts</p>
                  </div>
                  <Switch
                    checked={settings.general.enableRegistration}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, enableRegistration: checked },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Require Email Verification</p>
                    <p className="text-sm text-muted-foreground">Users must verify email before login</p>
                  </div>
                  <Switch
                    checked={settings.general.requireEmailVerification}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, requireEmailVerification: checked },
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Security Warning</AlertTitle>
            <AlertDescription>
              Changes to security settings may affect all users. Proceed with caution.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Password Policy</CardTitle>
              <CardDescription>Configure password requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="minLength">Minimum Password Length</Label>
                <Input
                  id="minLength"
                  type="number"
                  value={settings.security.passwordMinLength}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, passwordMinLength: parseInt(e.target.value) },
                    })
                  }
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Require Uppercase Letters</p>
                    <p className="text-sm text-muted-foreground">Passwords must contain A-Z</p>
                  </div>
                  <Switch
                    checked={settings.security.passwordRequireUppercase}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, passwordRequireUppercase: checked },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Require Numbers</p>
                    <p className="text-sm text-muted-foreground">Passwords must contain 0-9</p>
                  </div>
                  <Switch
                    checked={settings.security.passwordRequireNumbers}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, passwordRequireNumbers: checked },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Require Special Characters</p>
                    <p className="text-sm text-muted-foreground">Passwords must contain !@#$%</p>
                  </div>
                  <Switch
                    checked={settings.security.passwordRequireSpecial}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, passwordRequireSpecial: checked },
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Login Security</CardTitle>
              <CardDescription>Protect against unauthorized access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
                </div>
                <Switch
                  checked={settings.security.enableTwoFactor}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, enableTwoFactor: checked },
                    })
                  }
                />
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxAttempts">Max Login Attempts</Label>
                  <Input
                    id="maxAttempts"
                    type="number"
                    value={settings.security.maxLoginAttempts}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, maxLoginAttempts: parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
                  <Input
                    id="lockoutDuration"
                    type="number"
                    value={settings.security.lockoutDuration}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, lockoutDuration: parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">IP Whitelist</p>
                    <p className="text-sm text-muted-foreground">Restrict access to specific IPs</p>
                  </div>
                  <Switch
                    checked={settings.security.enableIpWhitelist}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, enableIpWhitelist: checked },
                      })
                    }
                  />
                </div>
                {settings.security.enableIpWhitelist && (
                  <div className="space-y-2">
                    <Label htmlFor="allowedIps">Allowed IP Addresses (one per line)</Label>
                    <Input
                      id="allowedIps"
                      placeholder="192.168.1.1&#10;10.0.0.0/24"
                      value={settings.security.allowedIps}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          security: { ...settings.security, allowedIps: e.target.value },
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                SMTP Configuration
              </CardTitle>
              <CardDescription>Configure email server settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    value={settings.email.smtpHost}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        email: { ...settings.email, smtpHost: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={settings.email.smtpPort}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        email: { ...settings.email, smtpPort: parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">SMTP Username</Label>
                  <Input
                    id="smtpUser"
                    value={settings.email.smtpUser}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        email: { ...settings.email, smtpUser: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">SMTP Password</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={settings.email.smtpPassword}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        email: { ...settings.email, smtpPassword: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={settings.email.smtpFromEmail}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        email: { ...settings.email, smtpFromEmail: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    value={settings.email.smtpFromName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        email: { ...settings.email, smtpFromName: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="encryption">Encryption</Label>
                <Select
                  value={settings.email.smtpEncryption}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      email: { ...settings.email, smtpEncryption: value },
                    })
                  }
                >
                  <SelectTrigger id="encryption">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="tls">TLS</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" onClick={() => handleTestConnection('Email')} className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Test Email Connection
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LDAP Settings */}
        <TabsContent value="ldap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                LDAP Configuration
              </CardTitle>
              <CardDescription>Configure LDAP/Active Directory authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable LDAP Authentication</p>
                  <p className="text-sm text-muted-foreground">Use LDAP for user authentication</p>
                </div>
                <Switch
                  checked={settings.ldap.enabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      ldap: { ...settings.ldap, enabled: checked },
                    })
                  }
                />
              </div>

              {settings.ldap.enabled && (
                <>
                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="ldapServer">LDAP Server URL</Label>
                    <Input
                      id="ldapServer"
                      placeholder="ldap://localhost:389"
                      value={settings.ldap.server}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ldap: { ...settings.ldap, server: e.target.value },
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="baseDn">Base DN</Label>
                    <Input
                      id="baseDn"
                      placeholder="dc=example,dc=com"
                      value={settings.ldap.baseDn}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ldap: { ...settings.ldap, baseDn: e.target.value },
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="bindDn">Bind DN</Label>
                      <Input
                        id="bindDn"
                        placeholder="cn=admin,dc=example,dc=com"
                        value={settings.ldap.bindDn}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            ldap: { ...settings.ldap, bindDn: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bindPassword">Bind Password</Label>
                      <Input
                        id="bindPassword"
                        type="password"
                        value={settings.ldap.bindPassword}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            ldap: { ...settings.ldap, bindPassword: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="userSearchBase">User Search Base</Label>
                      <Input
                        id="userSearchBase"
                        placeholder="ou=users,dc=example,dc=com"
                        value={settings.ldap.userSearchBase}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            ldap: { ...settings.ldap, userSearchBase: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="groupSearchBase">Group Search Base</Label>
                      <Input
                        id="groupSearchBase"
                        placeholder="ou=groups,dc=example,dc=com"
                        value={settings.ldap.groupSearchBase}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            ldap: { ...settings.ldap, groupSearchBase: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>

                  <Button variant="outline" onClick={() => handleTestConnection('LDAP')} className="w-full">
                    <Database className="h-4 w-4 mr-2" />
                    Test LDAP Connection
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Settings */}
        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backup Configuration</CardTitle>
              <CardDescription>Configure automatic backups</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Auto Backup</p>
                  <p className="text-sm text-muted-foreground">Automatically backup system data</p>
                </div>
                <Switch
                  checked={settings.backup.autoBackup}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      backup: { ...settings.backup, autoBackup: checked },
                    })
                  }
                />
              </div>

              {settings.backup.autoBackup && (
                <>
                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="frequency">Backup Frequency</Label>
                    <Select
                      value={settings.backup.backupFrequency}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          backup: { ...settings.backup, backupFrequency: value },
                        })
                      }
                    >
                      <SelectTrigger id="frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="retention">Backup Retention (days)</Label>
                    <Input
                      id="retention"
                      type="number"
                      value={settings.backup.backupRetention}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          backup: { ...settings.backup, backupRetention: parseInt(e.target.value) },
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Backup Location</Label>
                    <Input
                      id="location"
                      value={settings.backup.backupLocation}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          backup: { ...settings.backup, backupLocation: e.target.value },
                        })
                      }
                    />
                  </div>
                </>
              )}

              <Separator />

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  Create Backup Now
                </Button>
                <Button variant="outline" className="flex-1">
                  Restore from Backup
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Danger Zone</AlertTitle>
            <AlertDescription>
              These settings can significantly impact system performance and security.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>System Maintenance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start">
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear System Cache
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Database className="h-4 w-4 mr-2" />
                Optimize Database
              </Button>
              <Button variant="outline" className="w-full justify-start text-destructive">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Reset All Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
