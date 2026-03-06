"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Monitor,
  Search,
  Filter,
  Grid3x3,
  List,
  SortAsc,
  Clock,
  ExternalLink,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";

interface Connection {
  identifier: string;
  name: string;
  protocol: string;
  hostname?: string;
  port?: number;
  lastUsed?: string;
}

type ViewMode = "grid" | "list";
type SortBy = "name" | "protocol" | "recent";

export default function ConnectionsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [filteredConnections, setFilteredConnections] = useState<Connection[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProtocol, setSelectedProtocol] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    if (!user) return;

    const fetchConnections = async () => {
      try {
        // Fetch connections
        const response = await axios.get("/api/connections/list", {
          params: {
            token: user.authToken,
            dataSource: user.dataSource,
          },
        });
        const connectionsList = response.data;
        setConnections(connectionsList);
        setFilteredConnections(connectionsList);
      } catch (error) {
        console.error("Failed to fetch connections", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [user]);

  // Filter and sort connections
  useEffect(() => {
    let filtered = [...connections];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (conn) =>
          conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conn.protocol.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Protocol filter
    if (selectedProtocol !== "all") {
      filtered = filtered.filter(
        (conn) => conn.protocol.toLowerCase() === selectedProtocol,
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "protocol":
          return a.protocol.localeCompare(b.protocol);
        case "recent":
          return (b.lastUsed || "").localeCompare(a.lastUsed || "");
        default:
          return 0;
      }
    });

    setFilteredConnections(filtered);
  }, [connections, searchQuery, selectedProtocol, sortBy]);

  const handleConnectionClick = (connectionId: string) => {
    window.open(`/connection/${connectionId}`, "_blank", "noopener,noreferrer");
  };

  const protocols = [
    "all",
    ...Array.from(new Set(connections.map((c) => c.protocol.toLowerCase()))),
  ];

  const getProtocolColor = (protocol: string) => {
    const colors: Record<string, string> = {
      rdp: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      vnc: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      ssh: "bg-green-500/10 text-green-400 border-green-500/20",
      telnet: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    };
    return (
      colors[protocol.toLowerCase()] ||
      "bg-gray-500/10 text-gray-400 border-gray-500/20"
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Connections</h1>
          <p className="text-muted-foreground mt-1">
            Browse and connect to your available remote desktops
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search connections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Protocol Filter */}
            <Select
              value={selectedProtocol}
              onValueChange={setSelectedProtocol}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Protocols" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Protocols</SelectItem>
                {protocols
                  .filter((p) => p !== "all")
                  .map((protocol) => (
                    <SelectItem key={protocol} value={protocol}>
                      {protocol.toUpperCase()}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortBy)}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">
                  <div className="flex items-center gap-2">
                    <SortAsc className="h-4 w-4" />
                    Name
                  </div>
                </SelectItem>
                <SelectItem value="protocol">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Protocol
                  </div>
                </SelectItem>
                <SelectItem value="recent">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {filteredConnections.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">
            {connections.length}
          </span>{" "}
          connections
        </p>
      </div>

      {/* Connections Grid/List */}
      {loading ? (
        <div
          className={cn(
            "grid gap-4",
            viewMode === "grid"
              ? "md:grid-cols-2 lg:grid-cols-3"
              : "grid-cols-1",
          )}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredConnections.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConnections.map((conn) => (
              <Card
                key={conn.identifier}
                className="group hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer"
                onClick={() => handleConnectionClick(conn.identifier)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <Monitor className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base group-hover:text-primary transition-colors truncate">
                          {conn.name}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={cn(
                            "mt-2 text-xs",
                            getProtocolColor(conn.protocol),
                          )}
                        >
                          {conn.protocol.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnectionClick(conn.identifier);
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Connect
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConnections.map((conn) => (
              <Card
                key={conn.identifier}
                className="group hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
                onClick={() => handleConnectionClick(conn.identifier)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <Monitor className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {conn.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              getProtocolColor(conn.protocol),
                            )}
                          >
                            {conn.protocol.toUpperCase()}
                          </Badge>
                          {conn.hostname && (
                            <span className="text-xs text-muted-foreground">
                              {conn.hostname}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConnectionClick(conn.identifier);
                      }}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Connect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-muted rounded-full mb-4">
              <Monitor className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No connections found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {searchQuery || selectedProtocol !== "all"
                ? "Try adjusting your filters or search query"
                : "Contact your administrator to get access to remote desktops"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
