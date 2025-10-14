'use client';

import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";

// API 응답 타입을 정의합니다.
interface SearchItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate?: string; // 뉴스에만 존재
  cafename?: string; // 카페에만 존재
  cafeurl?: string; // 카페에만 존재
}

interface ApiResponse {
  items: SearchItem[];
  total: number;
  start: number;
  display: number;
  error?: string;
}

const dateFilters = [
  { label: '전체', days: null },
  { label: '1일', days: 1 },
  { label: '3일', days: 3 },
  { label: '7일', days: 7 },
];

export default function Home() {
  // 상태 관리
  const [searchType, setSearchType] = useState('news'); // 검색 유형 상태 추가
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('sim');
  const [allItems, setAllItems] = useState<SearchItem[]>([]); // 모든 검색 결과를 저장
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<number | null>(null);
  const [subQuery, setSubQuery] = useState(''); // 검색 내 검색을 위한 상태
  const [isHelpOpen, setIsHelpOpen] = useState(false); // 도움말 토글 상태

  const displayPerPage = 100; // 한 페이지에 표시할 개수

  const handleSearch = async () => {
    if (!query) {
      setError('검색어를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    setDateFilter(null);
    setSubQuery('');
    setCurrentPage(1);
    setAllItems([]);

    try {
      const initialUrl = `/api/search?query=${encodeURIComponent(query)}&display=100&start=1&sort=${sort}&type=${searchType}`;
      const initialRes = await fetch(initialUrl);
      const initialData: ApiResponse = await initialRes.json();

      if (!initialRes.ok || initialData.error) {
        throw new Error(initialData.error || `API call failed with status ${initialRes.status}`);
      }

      let allItems: SearchItem[] = initialData.items;
      const total = initialData.total;
      const maxResults = Math.min(total, 1000);

      const remainingCalls = Math.ceil((maxResults - 100) / 100);
      if (remainingCalls > 0) {
        const promises = Array.from({ length: remainingCalls }, (_, i) => {
          const start = (i + 1) * 100 + 1;
          const url = `/api/search?query=${encodeURIComponent(query)}&display=100&start=${start}&sort=${sort}&type=${searchType}`;
          return fetch(url).then(res => res.json());
        });

        const results = await Promise.all(promises);
        results.forEach((result: ApiResponse) => {
          if (result.items) {
            allItems = [...allItems, ...result.items];
          }
        });
      }

      if (allItems.length === 0) {
        setError('검색 결과가 없습니다.');
      }
      setAllItems(allItems);

    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(`API 호출 중 오류가 발생했습니다: ${e.message}`);
      } else {
        setError(`An unknown error occurred.`);
      }
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    let tempItems = allItems;

    // 1. 검색 내 검색 (subQuery)
    if (subQuery) {
      tempItems = tempItems.filter(item =>
        item.title.toLowerCase().includes(subQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(subQuery.toLowerCase())
      );
    }

    // 2. 날짜 필터링 (pubDate가 있는 경우에만)
    if (dateFilter !== null) {
      const now = new Date();
      const filterDate = new Date();
      filterDate.setDate(now.getDate() - dateFilter);
      tempItems = tempItems.filter(item => item.pubDate && new Date(item.pubDate) >= filterDate);
    }

    return tempItems;
  }, [allItems, dateFilter, subQuery]);

  const totalPages = Math.ceil(filteredItems.length / displayPerPage);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * displayPerPage;
    return filteredItems.slice(startIndex, startIndex + displayPerPage);
  }, [filteredItems, currentPage, displayPerPage]);

  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Naver Search</h1>
          <p className="text-muted-foreground">Enter a search query to find Naver news or cafe articles.</p>
        </header>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <Select value={searchType} onValueChange={setSearchType}>
            <SelectTrigger className="w-full md:w-[120px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="news">News</SelectItem>
              <SelectItem value="cafe">Cafe</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder={`Search for ${searchType}...`}
            className="flex-grow"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <div className="flex gap-4">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">Accuracy</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full md:w-auto" onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </div>
        
        <div className="mb-8">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsHelpOpen(!isHelpOpen)}>
              {isHelpOpen ? '도움말 닫기' : '검색 연산자 도움말'}
            </Button>
          </div>
          {isHelpOpen && (
            <div className="p-4 mt-2 bg-secondary/50 rounded-lg border text-sm text-muted-foreground">
              <ul className="list-disc pl-5 space-y-2">
                <li><code className="font-semibold text-primary">+</code>: 반드시 포함 (예: <code className="bg-background p-1 rounded">반도체 +삼성</code>)</li>
                <li><code className="font-semibold text-primary">-</code>: 제외 (예: <code className="bg-background p-1 rounded">아이폰 -가격</code>)</li>
                <li><code className="font-semibold text-primary">|</code>: 또는 (예: <code className="bg-background p-1 rounded">자동차 |선박</code>)</li>
                <li><code className="font-semibold text-primary">&quot; &quot;</code>: 정확히 일치 (예: <code className="bg-background p-1 rounded">&quot;인공지능 비서&quot;</code>)</li>
              </ul>
            </div>
          )}
        </div>

        {allItems.length > 0 && !loading && (
          <div className="space-y-4 p-4 border rounded-lg mb-8">
             <Input
                placeholder="결과 내 검색..."
                value={subQuery}
                onChange={(e) => {
                  setCurrentPage(1); // 검색 내 검색 시 첫 페이지로 이동
                  setSubQuery(e.target.value);
                }}
              />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {searchType === 'news' && dateFilters.map(filter => (
                  <Button 
                    key={filter.label} 
                    variant={dateFilter === filter.days ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => { setCurrentPage(1); setDateFilter(filter.days); }}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground shrink-0 ml-4">
                총 <span className="font-semibold text-primary">{filteredItems.length}</span>개 결과
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {loading && (
            Array.from({ length: 5 }).map((_, index) => (
              <Card key={index}>
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-5/6" /></CardContent>
              </Card>
            ))
          )}
          {error && <p className="text-red-500 text-center py-8">{error}</p>}
          {!loading && !error && allItems.length === 0 && (
             <p className="text-center text-muted-foreground py-8">Search results will appear here.</p>
          )}
          {paginatedItems.map((item, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle dangerouslySetInnerHTML={{ __html: item.title }} />
                {item.pubDate && <CardDescription>{new Date(item.pubDate).toLocaleString()}</CardDescription>}
                {item.cafename && <CardDescription>From: {item.cafename}</CardDescription>}
              </CardHeader>
              <CardContent><p dangerouslySetInnerHTML={{ __html: item.description }} /></CardContent>
              <CardFooter className="flex justify-end gap-4">
                {item.originallink && <Button variant="outline" asChild><a href={item.originallink} target="_blank" rel="noopener noreferrer">Read Original</a></Button>}
                {item.cafeurl && <Button variant="outline" asChild><a href={item.cafeurl} target="_blank" rel="noopener noreferrer">Visit Cafe</a></Button>}
                <Button asChild><a href={item.link} target="_blank" rel="noopener noreferrer">Read on Naver</a></Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {totalPages > 1 && (
          <Pagination className="mt-8">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''} />
              </PaginationItem>
              {[...Array(Math.min(totalPages, 10))].map((_, i) => {
                  const page = currentPage > 5 ? Math.min(currentPage - 5 + i, totalPages - 9 + i) : i + 1;
                  if (page > totalPages) return null;
                  return (
                    <PaginationItem key={i}>
                        <PaginationLink href="#" isActive={page === currentPage} onClick={(e) => { e.preventDefault(); setCurrentPage(page); }}>
                        {page}
                        </PaginationLink>
                    </PaginationItem>
                  )
              })}
              <PaginationItem>
                <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </main>
  );
}