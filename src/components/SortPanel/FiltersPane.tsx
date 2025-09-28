"use client";

import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { TinderStack, TinderStackRef } from "./TinderStack";
import { useCredits } from "@/providers/CreditsProvider";
import {
  getMediaInboxAction,
  MediaInboxItem,
  voteMediaInboxItemAction,
} from "@/server/actions";
import type { DemoCard } from "./types";
import { FiltersHeader } from "./components/FiltersHeader";
import { CategorySelect } from "./components/CategorySelect";
import { GetMoreCard } from "./components/GetMoreCard";
import { DemoCardView } from "./components/DemoCardView";
import { ActionsBar } from "./components/ActionsBar";
import { useWorldVerification } from "@/hooks/useWorldVerification";

type FiltersPaneProps = { showHeader?: boolean; initialCategory?: string };

export function FiltersPane({
  showHeader = true,
  initialCategory,
}: FiltersPaneProps) {
  const { isHuman, verifyHumanity } = useWorldVerification();
  const { addSwipe } = useCredits();
  const [flippedCard, setFlippedCard] = useState<string | null>(null);
  const [thumbsAnimation, setThumbsAnimation] = useState<
    "left" | "right" | null
  >(null);
  // Track if swipe came from external button to avoid double animation
  const externalSwipeRef = useRef<"left" | "right" | null>(null);
  // Track if we already showed live drag feedback this gesture
  const hadLiveDragRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allItems, setAllItems] = useState<(DemoCard | MediaInboxItem)[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    () => initialCategory ?? "all"
  );
  const tinderStackRef = useRef<TinderStackRef>(null);

  const demoItems = useMemo<DemoCard[]>(
    () => [
      {
        id: "a",
        title: "St. Peter & St. Paul's Church in Vilnius, Lithuania",
        subtitle:
          "centerpiece of a former monastery complex of the Canons Regular of the Lateran.",
        image: "/assets/demo-images/fresco.png",
        description:
          "The church is a fine example of the early Baroque style, with its symmetrical facade and decorative elements.",
        category: "shelter",
      },
      {
        id: "b",
        title: "The Hoare Cube",
        subtitle: "“Program correctness and incorrectness are two sides of the same coin”.",
        image: "/assets/demo-images/hoare.png",
        description:
          "The Hoare Cube is a 3D printed cube that is used to test the correctness of programs. It is a physical representation of the Hoare Cube, which is a mathematical model of the correctness of programs.",
        category: "education",
      },
      {
        id: "c",
        title: "Miles Davis Live at Newport",
        subtitle: "1969",
        image: "/assets/demo-images/miles.png",
        description:
          "The 1969 Newport Jazz Festival experimented with featuring both jazz, soul, funk and rock. James Brown and Frank Zappa played next to Dave Brubeck and Art Blakey. At the center of it all was Miles Davis.",
        category: "education",
      },
      {
        id: "d",
        title: "Tree Rings",
        subtitle: "This 1,300 year old tree that was cut down in 1891",
        image: "/assets/demo-images/rings.png",
        description:
          "Tree rings are a record of the climate. The wider the ring, the warmer the climate. The narrower the ring, the cooler the climate.",
        category: "education",
      },
    ],
    []
  );

  // Initialize with demo items + "Get More Cards" at the bottom
  useEffect(() => {
    const getMoreCard: DemoCard = {
      id: "get-more-cards",
      title: "Get More Cards",
      subtitle: "Load more content from the database",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&crop=center",
      description:
        "# Get More Cards\n\n**Load fresh content:**\n\n- New curated items\n- Latest updates\n- More variety\n\n*Tap to load more cards from our database.*",
      // keep visible for all categories
      category: "tools",
    };

    setAllItems([...demoItems, getMoreCard]);
    // Ensure hasMoreItems is true initially
    setHasMoreItems(true);
  }, [demoItems]);

  // Reset stack index when category changes
  useEffect(() => {
    setCurrentIndex(0);
    setFlippedCard(null);
  }, [selectedCategory]);

  // Load more items from database
  const loadMoreItems = useCallback(async () => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const result = await getMediaInboxAction({
        limit: 5,
        cursor: nextCursor || undefined,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
      });

      if (result.ok && result.items) {
        // Find the "Get More Cards" card and insert new items above it
        const getMoreCardIndex = allItems.findIndex(
          (item) => item.id === "get-more-cards"
        );

        if (getMoreCardIndex !== -1) {
          // Insert new items above the "Get More Cards" card
          const newItems = [
            ...allItems.slice(0, getMoreCardIndex),
            ...result.items,
            ...allItems.slice(getMoreCardIndex),
          ];

          setAllItems(newItems);
          setNextCursor(result.nextCursor);
          setHasMoreItems(result.hasMore || false);
        }
      }
    } catch (error) {
      console.error("Error loading more items:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, nextCursor, allItems, selectedCategory]);

  const onSwipe = useCallback(
    async (
      dir: "left" | "right",
      item: DemoCard | MediaInboxItem,
      index: number
    ) => {
      if (!isHuman) {
        // Block swipe and prompt humanity verification
        try {
          await verifyHumanity();
        } catch {}
        return;
      }
      // Check if this is the "Get More Cards" card
      if (item.id === "get-more-cards") {
        await loadMoreItems();
        return;
      }

      // Right = yay, Left = nay (to be persisted later)
      // Earn +1 credit per vote
      await addSwipe(1);
      // Trigger thumbs animation only if not already shown via button or live drag
      if (externalSwipeRef.current) {
        externalSwipeRef.current = null;
      } else if (hadLiveDragRef.current) {
        hadLiveDragRef.current = false;
      } else {
        setThumbsAnimation(dir);
        setTimeout(() => setThumbsAnimation(null), 300);
      }
      // Update current index
      setCurrentIndex(index + 1);
      // Persist a media_inbox vote when item.id looks like a UUID
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          item.id
        );
      if (isUUID) {
        try {
          await voteMediaInboxItemAction({
            inbox_item_id: item.id,
            up: dir === "right",
          });
        } catch {
          // Silently ignore for demo data
        }
      }
    },
    [addSwipe, loadMoreItems, isHuman, verifyHumanity]
  );

  // External swipe handlers for buttons
  const handleExternalSwipe = useCallback(
    async (dir: "left" | "right") => {
      if (!isHuman) {
        try {
          await verifyHumanity();
        } catch {}
        return;
      }
      // Trigger thumbs animation
      setThumbsAnimation(dir);
      setTimeout(() => setThumbsAnimation(null), 300);
      // Mark this swipe as external so onSwipe doesn't re-animate
      externalSwipeRef.current = dir;

      // Trigger the TinderStack's internal swipe animation
      if (dir === "left") {
        tinderStackRef.current?.swipeLeft();
      } else {
        tinderStackRef.current?.swipeRight();
      }
    },
    [isHuman, verifyHumanity]
  );

  const onFlip = useCallback(
    (item: DemoCard) => {
      setFlippedCard(flippedCard === item.id ? null : item.id);
    },
    [flippedCard]
  );

  // Compute filtered items for the current category; always keep the "Get More Cards" at the end if present
  const displayItems = useMemo(() => {
    const getMore = allItems.find((i) => i.id === "get-more-cards");
    const base = allItems.filter((i) => {
      if (i.id === "get-more-cards") return false;
      if (selectedCategory === "all") return true;
      const any = i as Record<string, unknown>;
      const cat = any && (any.category as string | undefined);
      return cat === selectedCategory;
    });
    return getMore ? [...base, getMore] : base;
  }, [allItems, selectedCategory]);

  return (
    <div className="relative h-full w-full">
      {showHeader && <FiltersHeader />}

      <main className="pt-16 pb-14 h-full overflow-hidden px-4">
        <div className="mx-auto max-w-sm mt-2">
          {/* Category filter */}
          <CategorySelect
            value={selectedCategory}
            onChange={setSelectedCategory}
          />
          {/* Card container - fixed height */}
          <div className="h-[50vh] relative">
            {!isHuman && (
              <div
                className="absolute inset-0"
                style={{ pointerEvents: "auto", zIndex: 200 }}
                onClick={() => {
                  void verifyHumanity();
                }}
                onTouchStart={() => {
                  void verifyHumanity();
                }}
              />
            )}
            <TinderStack
              ref={tinderStackRef}
              items={displayItems}
              disabled={!isHuman}
              onSwipe={
                onSwipe as (
                  dir: "left" | "right",
                  item: unknown,
                  index: number
                ) => void
              }
              onDragDirectionChange={(dir) => {
                if (dir) hadLiveDragRef.current = true;
                setThumbsAnimation(dir);
              }}
              renderCard={(item: unknown, _index, isTop) => {
                const demoItem = item as DemoCard;
                const isFlipped = flippedCard === demoItem.id;

                // Special handling for "Get More Cards" card
                if (demoItem.id === "get-more-cards") {
                  const isDisabled = !hasMoreItems || isLoadingMore;
                  return (
                    <GetMoreCard
                      isDisabled={isDisabled}
                      isLoading={isLoadingMore}
                      hasMore={hasMoreItems}
                      onClick={loadMoreItems}
                    />
                  );
                }

                return (
                  <DemoCardView
                    item={demoItem}
                    isTop={isTop}
                    isFlipped={isFlipped}
                  />
                );
              }}
            />
          </div>

          {/* Action buttons - separate container below cards */}
          <ActionsBar
            onSwipeLeft={() => handleExternalSwipe("left")}
            onSwipeRight={() => handleExternalSwipe("right")}
            onFlip={() => {
              const currentItem = displayItems[currentIndex];
              if (currentItem) onFlip(currentItem as DemoCard);
            }}
            thumbsAnimation={thumbsAnimation}
            isCurrentFlipped={flippedCard === displayItems[currentIndex]?.id}
          />
        </div>
      </main>
    </div>
  );
}
