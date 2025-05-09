"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GithubIcon } from "@/components/ui/icons/github";
import { useUser } from "@clerk/nextjs";
import { CheckCircle2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface GitHubUser {
	login: string;
	name: string | null;
	avatar_url: string;
	bio: string | null;
	public_repos: number;
}

interface GitHubRepo {
	id: number;
	name: string;
	full_name: string;
	description: string | null;
	stargazers_count: number;
	forks_count: number;
	updated_at: string;
	html_url: string;
}

interface GitHubNotification {
	id: string;
	repository: { full_name: string };
	subject: { title: string; url: string | null };
	reason: string;
	updated_at: string;
}

export default function GitHubIntegrationPage() {
	const { user, isLoaded: userLoaded } = useUser();
	const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
	const [repos, setRepos] = useState<GitHubRepo[]>([]);
	const [notifications, setNotifications] = useState<GitHubNotification[]>([]);
	const [loading, setLoading] = useState(true);
	const [isSyncing, setIsSyncing] = useState(false);
	const [error, setError] = useState<{
		message: string;
		details?: unknown;
	} | null>(null);

	const isConnected = user?.externalAccounts?.some(
		(account) => account.provider === "github",
	);

	useEffect(() => {
		async function fetchGitHubData() {
			if (!userLoaded || !isConnected) {
				setLoading(false);
				return;
			}

			try {
				const response = await fetch("/api/github/data", {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
					},
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error, { cause: errorData });
				}

				const data = await response.json();
				setGithubUser(data.user);
				setRepos(data.repos);
				setNotifications(data.notifications);
			} catch (err: unknown) {
				if (err instanceof Error) {
					setError({
						message: err.message,
						details: (err.cause as { details?: unknown })?.details,
					});
				} else {
					setError({ message: "An unknown error occurred" });
				}
			} finally {
				setLoading(false);
			}
		}

		fetchGitHubData();
	}, [userLoaded, isConnected]);

	const handleDisconnect = async () => {
		try {
			const response = await fetch("/api/github/disconnect", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error, { cause: errorData });
			}

			// Redirect to the integrations page after disconnecting
			window.location.href = "/integrations";
		} catch (err: unknown) {
			if (err instanceof Error) {
				setError({
					message: err.message,
					details: (err.cause as { details?: unknown })?.details,
				});
			} else {
				setError({ message: "An unknown error occurred" });
			}
		}
	};

	const handleSync = async () => {
		setIsSyncing(true);
		try {
			const response = await fetch("/api/github/sync", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error, { cause: errorData });
			}

			const result = await response.json();
			toast.success("GitHub Data Synced", {
				description: `Successfully stored ${result.chunks} chunks in the database.`,
			});
		} catch (err: unknown) {
			if (err instanceof Error) {
				setError({
					message: err.message,
					details: (err.cause as { details?: unknown })?.details,
				});
				toast.error("Sync Failed", {
					description: err.message,
				});
			} else {
				toast.error("Sync Failed", {
					description: "An unknown error occurred",
				});
			}
		} finally {
			setIsSyncing(false);
		}
	};

	if (!userLoaded || loading) {
		return (
			<div className="flex h-full items-center justify-center">
				<p>Loading...</p>
			</div>
		);
	}

	if (!isConnected) {
		return (
			<div className="p-8">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center space-x-2">
							<GithubIcon className="h-6 w-6" />
							<span>GitHub Integration</span>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="mb-4 text-muted-foreground">
							Connect your GitHub account to access your repositories and
							notifications.
						</p>
						<Button asChild>
							<Link href="/sign-in?redirect=/integrations/github">
								Connect GitHub
							</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-8">
				<Card>
					<CardContent>
						<p className="text-red-500">Error: {error.message}</p>
						<pre className="mt-2 text-gray-500 text-sm">
							{JSON.stringify(error.details ?? {}, null, 2)}
						</pre>

						<Button variant="outline" className="mt-4" asChild>
							<Link href="/sign-in?redirect=/integrations/github">
								Reconnect GitHub
							</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="h-full flex-1 flex-col space-y-8 p-8">
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-4">
					<GithubIcon className="h-8 w-8" />
					<div>
						<h2 className="font-bold text-2xl tracking-tight">
							GitHub Integration
						</h2>
						<p className="text-muted-foreground">
							Manage your GitHub repositories and notifications
						</p>
					</div>
					<Badge
						variant="default"
						className="bg-green-500/10 text-green-500 hover:bg-green-500/20"
					>
						<CheckCircle2 className="mr-1 h-3 w-3" />
						Connected
					</Badge>
				</div>
				<div className="flex space-x-2">
					<Button variant="default" onClick={handleSync} disabled={isSyncing}>
						{isSyncing ? (
							<>
								<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
								Syncing...
							</>
						) : (
							<>
								<RefreshCw className="mr-2 h-4 w-4" />
								Sync Data
							</>
						)}
					</Button>
					<Button variant="outline" onClick={handleDisconnect}>
						Disconnect
					</Button>
				</div>
			</div>

			{/* User Profile */}
			{githubUser && (
				<Card>
					<CardHeader>
						<CardTitle>User Profile</CardTitle>
					</CardHeader>
					<CardContent className="flex items-center space-x-4">
						<img
							src={githubUser.avatar_url}
							alt={githubUser.login}
							className="h-16 w-16 rounded-full"
						/>
						<div>
							<h3 className="font-medium text-lg">
								{githubUser.name ?? githubUser.login}
							</h3>
							{githubUser.bio && (
								<p className="text-muted-foreground text-sm">
									{githubUser.bio}
								</p>
							)}
							<p className="text-muted-foreground text-sm">
								Repositories: {githubUser.public_repos}
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Notifications */}
			<Card>
				<CardHeader>
					<CardTitle>Notifications</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4">
						{notifications.length === 0 && (
							<p className="text-muted-foreground">No notifications found.</p>
						)}
						{notifications.map((notification) => (
							<div
								key={notification.id}
								className="flex items-center justify-between border-b py-2"
							>
								<div>
									<p className="font-medium text-sm">
										{notification.subject.title}
									</p>
									<p className="text-muted-foreground text-sm">
										{notification.repository.full_name} ({notification.reason})
									</p>
									<p className="text-muted-foreground text-sm">
										Updated:{" "}
										{new Date(notification.updated_at).toLocaleDateString()}
									</p>
								</div>
								{notification.subject.url && (
									<Button variant="outline" asChild>
										<Link
											href={notification.subject.url.replace(
												"api.github.com/repos",
												"github.com",
											)}
											target="_blank"
										>
											View
										</Link>
									</Button>
								)}
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
