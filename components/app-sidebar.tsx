'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, LogOut } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuthStore } from '@/lib/store';
import { navigationItems } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Separator } from './ui/separator';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      {/* Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard" className="flex items-center gap-2">
                <div className="flex aspect-square size-7 items-center justify-center">
                  <Image
                    src="/railtel_logo_dark.svg"
                    alt="Logo"
                    width={28}
                    height={28}
                    className="dark:hidden"
                  />
                  <Image
                    src="/railtel_logo_light.svg"
                    alt="Logo"
                    width={28}
                    height={28}
                    className="hidden dark:block"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{process.env.NEXT_PUBLIC_APP_NAME}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {process.env.NEXT_PUBLIC_APP_TAGLINE}
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent>
        {/* Main Menu */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <React.Fragment key={item.href}>
                  {item.items ? (
                    <Collapsible defaultOpen={pathname.startsWith(item.href)} className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.title}
                            className={cn(
                              pathname.startsWith(item.href) && 'bg-accent text-accent-foreground',
                            )}
                          >
                            <item.icon className="size-4" />
                            <span>{item.title}</span>
                            <ChevronDown className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.href}>
                                <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
                                  <a href={subItem.href}>
                                    <subItem.icon className="size-4" />
                                    <span>{subItem.title}</span>
                                  </a>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ) : (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip={item.title} isActive={pathname === item.href}>
                        <a href={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="ml-auto">
                              {item.badge}
                            </Badge>
                          )}
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </React.Fragment>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer - User Profile */}
      <SidebarFooter>
        <SidebarMenu>
          <Separator />
          <SidebarMenuItem>
            <div
              onClick={handleLogout}
              className="text-destructive bg-foreground/10 gap-2 rounded-lg flex justify-start items-center px-4 py-2 font-medium cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
