import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TeamMember {
  id: string;
  name: string;
  avatar_url: string | null;
  role: string;
}

interface MentionTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
}

export function MentionTextarea({
  className,
  value,
  onChange,
  onValueChange,
  ...props
}: MentionTextareaProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["team_members_public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_members_public")
        .select("id, name, avatar_url, role")
        .eq("is_active", true)
        .order("name");
      return (data as TeamMember[]) || [];
    },
  });

  const filteredMembers = teamMembers.filter((member) =>
    member.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    // Check if we're in a mention context
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if there's no space between @ and cursor (valid mention context)
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        setMentionQuery(textAfterAt);
        setMentionStartIndex(lastAtIndex);
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }

    onChange?.(e);
    onValueChange?.(newValue);
  };

  const insertMention = useCallback(
    (member: TeamMember) => {
      if (!textareaRef.current) return;

      const currentValue = String(value || "");
      const beforeMention = currentValue.slice(0, mentionStartIndex);
      const afterMention = currentValue.slice(
        mentionStartIndex + mentionQuery.length + 1
      );
      const mentionText = `@${member.name} `;
      const newValue = beforeMention + mentionText + afterMention;

      // Create a synthetic event
      const syntheticEvent = {
        target: { value: newValue },
      } as React.ChangeEvent<HTMLTextAreaElement>;

      onChange?.(syntheticEvent);
      onValueChange?.(newValue);
      setShowSuggestions(false);
      setMentionQuery("");

      // Set cursor position after mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = mentionStartIndex + mentionText.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [value, mentionStartIndex, mentionQuery, onChange, onValueChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || filteredMembers.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredMembers.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredMembers.length - 1
        );
        break;
      case "Enter":
        if (showSuggestions) {
          e.preventDefault();
          insertMention(filteredMembers[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        className={className}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        {...props}
      />
      {showSuggestions && filteredMembers.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto"
        >
          {filteredMembers.map((member, index) => (
            <button
              key={member.id}
              type="button"
              className={cn(
                "w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-accent transition-colors",
                index === selectedIndex && "bg-accent"
              )}
              onClick={() => insertMention(member)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {member.role}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
