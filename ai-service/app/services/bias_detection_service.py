def check_bias(feedback: str):
    harmful_words = ["stupid", "bad", "useless"]
    for word in harmful_words:
        if word in feedback.lower():
            return "Failed"
    return "Passed"