 import { cn } from "@/lib/utils";
 import type { TeamMember } from "@/types/tasks";
 import { User } from "lucide-react";
 import {
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger,
 } from "@/components/ui/tooltip";
 
 interface StackedAvatarsProps {
   assignees: TeamMember[];
   maxVisible?: number;
   size?: "sm" | "md";
   className?: string;
 }
 
 export function StackedAvatars({ 
   assignees, 
   maxVisible = 3, 
   size = "sm",
   className 
 }: StackedAvatarsProps) {
   const visible = assignees.slice(0, maxVisible);
   const remaining = assignees.length - maxVisible;
 
   const sizeClasses = size === "sm" 
     ? "h-5 w-5 text-[10px]" 
     : "h-6 w-6 text-xs";
 
   if (assignees.length === 0) {
     return (
       <div className={cn("flex items-center gap-1 text-muted-foreground", className)}>
         <User className={cn("h-3 w-3", size === "md" && "h-4 w-4")} />
         <span className={cn("text-xs", size === "md" && "text-sm")}>Não atribuído</span>
       </div>
     );
   }
 
   return (
     <TooltipProvider>
       <Tooltip>
         <TooltipTrigger asChild>
           <div className={cn("flex items-center -space-x-2 cursor-pointer", className)}>
             {visible.map((member, index) => (
               <div
                 key={member.id}
                 className={cn(
                   "rounded-full ring-2 ring-background flex items-center justify-center",
                   sizeClasses
                 )}
                 style={{ zIndex: maxVisible - index }}
               >
                 {member.avatar_url ? (
                   <img 
                     src={member.avatar_url} 
                     alt={member.name} 
                     className="h-full w-full rounded-full object-cover" 
                   />
                 ) : (
                   <div className={cn(
                     "h-full w-full rounded-full bg-primary/20 flex items-center justify-center",
                     sizeClasses
                   )}>
                     <span className="font-medium text-primary">
                       {member.name.charAt(0).toUpperCase()}
                     </span>
                   </div>
                 )}
               </div>
             ))}
             {remaining > 0 && (
               <div 
                 className={cn(
                   "rounded-full ring-2 ring-background bg-muted flex items-center justify-center font-medium text-muted-foreground",
                   sizeClasses
                 )}
               >
                 +{remaining}
               </div>
             )}
           </div>
         </TooltipTrigger>
         <TooltipContent side="top" className="max-w-[200px]">
           <div className="space-y-1">
             {assignees.map(member => (
               <div key={member.id} className="text-xs">
                 {member.name}
               </div>
             ))}
           </div>
         </TooltipContent>
       </Tooltip>
     </TooltipProvider>
   );
 }