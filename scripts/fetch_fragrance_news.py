import anthropic
import os
from datetime import date


def main():
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    today_str = date.today().strftime("%B %d, %Y")
    today_iso = date.today().isoformat()

    print(f"Fetching fragrance news for {today_str}...")

    messages = [
        {
            "role": "user",
            "content": f"""Search for new fragrance releases and announcements from the past 24 hours (today is {today_str}).

For each new fragrance found, provide a slideshow-ready entry with:
- SLIDE NUMBER
- Brand & Fragrance Name
- Type: Flanker or Original line
- Notes: Top / Middle / Base
- Bottle Design description
- Release Date & when it was Announced
- Price (if available)
- Notable Details (limited edition, collaboration, etc.)
- Official Links (brand page, press release)

Separate each slide with ---

Search multiple sources: Fragrantica, brand websites, beauty press (Allure, WWD, Vogue Beauty, NewBeauty), and PR Newswire.

If nothing new was found in the past 24 hours specifically, say "Nothing new found today." Do not include older releases.
""",
        }
    ]

    # Agentic loop to handle tool use
    while True:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=messages,
        )

        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            break

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": "",
                        }
                    )
            if tool_results:
                messages.append({"role": "user", "content": tool_results})
        else:
            break

    # Extract final text output
    output_parts = []
    for block in response.content:
        if hasattr(block, "text") and block.text:
            output_parts.append(block.text)

    output = "\n".join(output_parts).strip()

    os.makedirs("releases", exist_ok=True)
    filepath = f"releases/{today_iso}.md"
    with open(filepath, "w") as f:
        f.write(f"# Fragrance News — {today_str}\n\n")
        f.write(output)
        f.write("\n")

    print(f"Saved: {filepath}")
    print(f"\n--- Preview ---\n{output[:500]}...")


if __name__ == "__main__":
    main()
