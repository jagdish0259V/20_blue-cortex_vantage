from sklearn.cluster import KMeans
import numpy as np

def cluster_embeddings(embeddings, n_clusters=2):
    if len(embeddings) < n_clusters:
        return [0] * len(embeddings)

    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    labels = kmeans.fit_predict(np.array(embeddings))
    return labels.tolist()