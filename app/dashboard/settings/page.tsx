'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Bell,
  Monitor,
  Palette,
  Volume2,
  Keyboard,
  Save,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: false,
      desktop: true,
      connectionStart: true,
      connectionEnd: true,
      systemAlerts: true,
    },
    display: {
      compactMode: false,
      showAvatars: true,
      animationsEnabled: true,
      highContrast: false,
    },
    connection: {
      autoConnect: false,
      rememberLastConnection: true,
      showThumbnails: true,
      enableClipboard: true,
      enableSound: true,
      quality: 'high' as 'low' | 'medium' | 'high',
    },
    keyboard: {
      captureAllKeys: false,
      enableShortcuts: true,
      layout: 'us' as string,
    },
  });

  useEffect(() => setMounted(true), []);

  const handleSave = () => {
    // Save settings to API/localStorage
    toast.success('Settings saved successfully');
  };

  const handleReset = () => {
    // Reset to default settings
    toast.info('Settings reset to defaults');
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 py-6 max-w-4xl animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">Customize your experience</p>
      </div>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Customize the look and feel of the application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme */}
          <div className="space-y-3">
            <Label>Theme</Label>
            <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-4">
              <div>
                <RadioGroupItem value="light" id="light" className="peer sr-only" />
                <Label
                  htmlFor="light"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Sun className="mb-3 h-6 w-6" />
                  Light
                </Label>
              </div>
              <div>
                <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                <Label
                  htmlFor="dark"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Moon className="mb-3 h-6 w-6" />
                  Dark
                </Label>
              </div>
              <div>
                <RadioGroupItem value="system" id="system" className="peer sr-only" />
                <Label
                  htmlFor="system"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Monitor className="mb-3 h-6 w-6" />
                  System
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Display Options */}
          <div className="space-y-4">
            <Label>Display Options</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Compact Mode</p>
                  <p className="text-sm text-muted-foreground">Reduce spacing for more content</p>
                </div>
                <Switch
                  checked={settings.display.compactMode}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      display: { ...settings.display, compactMode: checked },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Show Avatars</p>
                  <p className="text-sm text-muted-foreground">Display user avatars</p>
                </div>
                <Switch
                  checked={settings.display.showAvatars}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      display: { ...settings.display, showAvatars: checked },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Animations</p>
                  <p className="text-sm text-muted-foreground">Enable smooth transitions</p>
                </div>
                <Switch
                  checked={settings.display.animationsEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      display: { ...settings.display, animationsEnabled: checked },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">High Contrast</p>
                  <p className="text-sm text-muted-foreground">Increase contrast for accessibility</p>
                </div>
                <Switch
                  checked={settings.display.highContrast}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      display: { ...settings.display, highContrast: checked },
                    })
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Manage your notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <Switch
                checked={settings.notifications.email}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, email: checked },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Get browser notifications</p>
              </div>
              <Switch
                checked={settings.notifications.push}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, push: checked },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Desktop Notifications</p>
                <p className="text-sm text-muted-foreground">Show system notifications</p>
              </div>
              <Switch
                checked={settings.notifications.desktop}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, desktop: checked },
                  })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Connection Start</p>
                <p className="text-sm text-muted-foreground">Notify when connection starts</p>
              </div>
              <Switch
                checked={settings.notifications.connectionStart}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, connectionStart: checked },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Connection End</p>
                <p className="text-sm text-muted-foreground">Notify when connection ends</p>
              </div>
              <Switch
                checked={settings.notifications.connectionEnd}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, connectionEnd: checked },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">System Alerts</p>
                <p className="text-sm text-muted-foreground">Important system messages</p>
              </div>
              <Switch
                checked={settings.notifications.systemAlerts}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, systemAlerts: checked },
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Connection Settings
          </CardTitle>
          <CardDescription>Configure remote desktop connection preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto Connect</p>
                <p className="text-sm text-muted-foreground">Automatically connect to last used session</p>
              </div>
              <Switch
                checked={settings.connection.autoConnect}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    connection: { ...settings.connection, autoConnect: checked },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Remember Last Connection</p>
                <p className="text-sm text-muted-foreground">Save your last connection for quick access</p>
              </div>
              <Switch
                checked={settings.connection.rememberLastConnection}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    connection: { ...settings.connection, rememberLastConnection: checked },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Show Thumbnails</p>
                <p className="text-sm text-muted-foreground">Display connection preview thumbnails</p>
              </div>
              <Switch
                checked={settings.connection.showThumbnails}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    connection: { ...settings.connection, showThumbnails: checked },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Clipboard</p>
                <p className="text-sm text-muted-foreground">Allow clipboard sharing with remote desktop</p>
              </div>
              <Switch
                checked={settings.connection.enableClipboard}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    connection: { ...settings.connection, enableClipboard: checked },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <div>
                  <p className="font-medium">Enable Sound</p>
                  <p className="text-sm text-muted-foreground">Play audio from remote desktop</p>
                </div>
              </div>
              <Switch
                checked={settings.connection.enableSound}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    connection: { ...settings.connection, enableSound: checked },
                  })
                }
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="quality">Connection Quality</Label>
            <Select
              value={settings.connection.quality}
              onValueChange={(value: 'low' | 'medium' | 'high') =>
                setSettings({
                  ...settings,
                  connection: { ...settings.connection, quality: value },
                })
              }
            >
              <SelectTrigger id="quality">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (Faster, Lower Quality)</SelectItem>
                <SelectItem value="medium">Medium (Balanced)</SelectItem>
                <SelectItem value="high">High (Slower, Better Quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard & Input
          </CardTitle>
          <CardDescription>Configure keyboard behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Capture All Keys</p>
              <p className="text-sm text-muted-foreground">Send all keyboard input to remote desktop</p>
            </div>
            <Switch
              checked={settings.keyboard.captureAllKeys}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  keyboard: { ...settings.keyboard, captureAllKeys: checked },
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Shortcuts</p>
              <p className="text-sm text-muted-foreground">Use keyboard shortcuts in the application</p>
            </div>
            <Switch
              checked={settings.keyboard.enableShortcuts}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  keyboard: { ...settings.keyboard, enableShortcuts: checked },
                })
              }
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="layout">Keyboard Layout</Label>
            <Select
              value={settings.keyboard.layout}
              onValueChange={(value) =>
                setSettings({
                  ...settings,
                  keyboard: { ...settings.keyboard, layout: value },
                })
              }
            >
              <SelectTrigger id="layout">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">US English</SelectItem>
                <SelectItem value="uk">UK English</SelectItem>
                <SelectItem value="in">Indian</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
