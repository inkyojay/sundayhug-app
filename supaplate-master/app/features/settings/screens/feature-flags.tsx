/**
 * Feature Flags 관리 페이지
 * 
 * 기능 활성화/비활성화를 실시간으로 제어
 */
import type { Route } from "./+types/feature-flags";

import { data, useLoaderData, useFetcher } from "react-router";
import { useState } from "react";
import { Settings, ToggleLeft, ToggleRight, MessageSquare, BookOpen, Sparkles } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/core/components/ui/card";
import { Button } from "~/core/components/ui/button";
import { Badge } from "~/core/components/ui/badge";
import makeServerClient from "~/core/lib/supa-client.server";
import adminClient from "~/core/lib/supa-admin-client.server";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Feature Flags | 관리자" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { data: flags, error } = await adminClient
    .from('feature_flags')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Feature flags 로드 오류:', error);
    return data({ flags: [] });
  }

  return data({ flags: flags || [] });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const key = formData.get('key') as string;
  const enabled = formData.get('enabled') === 'true';

  const { error } = await adminClient
    .from('feature_flags')
    .update({ enabled })
    .eq('key', key);

  if (error) {
    console.error('Feature flag 업데이트 오류:', error);
    return data({ success: false, error: error.message });
  }

  return data({ success: true });
}

// 아이콘 매핑
const iconMap: Record<string, React.ReactNode> = {
  chat_enabled: <MessageSquare className="w-5 h-5" />,
  blog_enabled: <BookOpen className="w-5 h-5" />,
};

export default function FeatureFlagsScreen() {
  const { flags } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const handleToggle = (key: string, currentEnabled: boolean) => {
    fetcher.submit(
      { key, enabled: String(!currentEnabled) },
      { method: 'POST' }
    );
  };

  // 카테고리별 그룹핑
  const groupedFlags = flags.reduce((acc, flag) => {
    const category = flag.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(flag);
    return acc;
  }, {} as Record<string, typeof flags>);

  const categoryNames: Record<string, string> = {
    customer: '고객 서비스',
    admin: '관리자 기능',
    general: '일반',
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Settings className="w-6 h-6 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
        </div>
        <p className="text-gray-500">
          기능을 실시간으로 활성화/비활성화할 수 있습니다. 변경 즉시 적용됩니다.
        </p>
      </div>

      {Object.entries(groupedFlags).map(([category, categoryFlags]) => (
        <div key={category} className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            {categoryNames[category] || category}
          </h2>
          
          <div className="space-y-4">
            {categoryFlags.map((flag) => {
              const isUpdating = fetcher.state !== 'idle' && 
                fetcher.formData?.get('key') === flag.key;
              
              return (
                <Card key={flag.id} className={`transition-all ${isUpdating ? 'opacity-50' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${
                          flag.enabled 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {iconMap[flag.key] || <Sparkles className="w-5 h-5" />}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{flag.name}</h3>
                            <Badge variant={flag.enabled ? "default" : "secondary"}>
                              {flag.enabled ? '활성화' : '비활성화'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {flag.description}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            키: <code className="bg-gray-100 px-1 rounded">{flag.key}</code>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleToggle(flag.key, flag.enabled)}
                          disabled={isUpdating}
                          className="focus:outline-none"
                        >
                          {flag.enabled ? (
                            <ToggleRight className="w-12 h-12 text-green-500 hover:text-green-600 transition-colors" />
                          ) : (
                            <ToggleLeft className="w-12 h-12 text-gray-300 hover:text-gray-400 transition-colors" />
                          )}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {flags.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">등록된 Feature Flag가 없습니다.</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded-xl">
        <h3 className="font-medium text-blue-900 mb-2">💡 사용 방법</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 토글을 클릭하면 즉시 적용됩니다</li>
          <li>• 비활성화하면 해당 기능이 홈 화면에서 숨겨집니다</li>
          <li>• 코드 배포 없이 실시간으로 기능을 제어할 수 있습니다</li>
        </ul>
      </div>
    </div>
  );
}

