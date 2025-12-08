/**
 * 사이드바 메인 메뉴
 * 
 * - 서브메뉴가 1개면 바로 링크로 이동
 * - 서브메뉴가 여러개면 펼침 메뉴
 */
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/core/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "~/core/components/ui/sidebar";

export default function SidebarMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const location = useLocation();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>관리 메뉴</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          // 서브메뉴가 1개이거나 없으면 바로 링크로 이동
          const hasSingleOrNoSubMenu = !item.items || item.items.length <= 1;
          const targetUrl = item.items?.[0]?.url || item.url;
          const isCurrentPage = location.pathname === targetUrl || location.pathname.startsWith(targetUrl + "/");

          if (hasSingleOrNoSubMenu) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  tooltip={item.title}
                  isActive={isCurrentPage}
                >
                  <Link to={targetUrl}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          // 서브메뉴가 여러개면 펼침 메뉴
          const isExpanded = item.items?.some(sub => location.pathname === sub.url);

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive || isExpanded}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton 
                          asChild
                          isActive={location.pathname === subItem.url}
                        >
                          <Link to={subItem.url}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
